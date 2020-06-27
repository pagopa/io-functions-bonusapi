import * as t from "io-ts";

import { IOrchestrationFunctionContext } from "durable-functions/lib/src/classes";

import {
  BonusActivation,
  BonusActivationStatusEnum
} from "../models/bonus_activation";
import {
  ActivityInput as ReadBonusActivityInput,
  ActivityResult as ReadBonusActivityResult
} from "../ReadBonusActivity/handler";
import {
  ActivityInput as ReplaceBonusActivityInput,
  ActivityResult as ReplaceBonusActivityResult
} from "../ReplaceBonusActivity/handler";
import { ActivityInput as SaveErrorActivityInput } from "../SaveErrorActivity/handler";
import { TrackEventT, TrackExceptionT } from "../utils/appinsights";
import { decodeOrThrowApplicationError } from "../utils/decode";
import {
  ApplicationError,
  applicationErrorToExceptionTelemetry
} from "../utils/errors";
import { GetContextErrorLoggerT } from "../utils/loggers";
import { RedeemedBonusMessage } from "../utils/types";

export const OrchestratorInput = RedeemedBonusMessage;

export type OrchestratorInput = t.TypeOf<typeof OrchestratorInput>;

const logPrefix = "ProcessRedeemedBonusMessageOrchestrator";

/**
 * Process the redemption of a single bonus
 */
export const getHandler = (
  getContextErrorLogger: GetContextErrorLoggerT,
  trackException: TrackExceptionT,
  trackEvent: TrackEventT
) =>
  function*(context: IOrchestrationFunctionContext): Generator {
    context.log(`${logPrefix}|Orchestrator started`);

    const contextErrorLogger = getContextErrorLogger(context, logPrefix);

    // tslint:disable-next-line: no-let
    let orchestratorInput;
    try {
      // Get and decode orchestrator input
      orchestratorInput = decodeOrThrowApplicationError(
        OrchestratorInput,
        context.df.getInput(),
        "Error decoding input"
      );
    } catch (e) {
      contextErrorLogger(e);
      trackException(applicationErrorToExceptionTelemetry(e));
      return false;
    }

    const { redeemedBonus, redeemedRequestBlob } = orchestratorInput;

    try {
      //#region
      // STEP 1: Read the bonus from the db
      // If max retry is reached the ApplicationError raised by the activity is handled in the catch block
      const readBonusActivityResultUnencoded = yield context.df.callActivityWithRetry(
        "ReadBonusActivity",
        {
          backoffCoefficient: 1.5,
          firstRetryIntervalInMilliseconds: 1000,
          maxNumberOfAttempts: 5,
          maxRetryIntervalInMilliseconds: 3600 * 100,
          retryTimeoutInMilliseconds: 3600 * 1000
        },
        ReadBonusActivityInput.encode({
          bonusId: redeemedBonus.bonus_code
        })
      );

      const readBonusActivityResult = decodeOrThrowApplicationError(
        ReadBonusActivityResult,
        readBonusActivityResultUnencoded,
        "Error decoding ReadBonusActivity result"
      );

      if (readBonusActivityResult.kind === "FAILURE") {
        // Log the error in the table storage
        throw new ApplicationError(
          readBonusActivityResult.reason,
          "", // No details
          false
        );
      }
      //#endregion

      const { bonus } = readBonusActivityResult;

      // STEP 2: Check the bonus status
      if (bonus.status !== BonusActivationStatusEnum.ACTIVE) {
        // Cant redeem non ACTIVE bonus
        throw new ApplicationError(
          "Bonus is not active",
          `STATUS=${bonus.status}`,
          false
        );
      }

      // STEP 3: Create a copy of the bonus in a redeemed state
      const updatedBonus: BonusActivation = {
        ...bonus,
        redeemedAt: redeemedBonus.redeemed_at,
        status: BonusActivationStatusEnum.REDEEMED
      };

      //#region
      // STEP 4: Replace the bonus in the db
      // If max retry is reached the ApplicationError raised by the activity is handled in the catch block
      const replaceBonusActivityResultUnencoded = yield context.df.callActivityWithRetry(
        "ReplaceBonusActivity",
        {
          backoffCoefficient: 1.5,
          firstRetryIntervalInMilliseconds: 1000,
          maxNumberOfAttempts: 5,
          maxRetryIntervalInMilliseconds: 3600 * 100,
          retryTimeoutInMilliseconds: 3600 * 1000
        },
        ReplaceBonusActivityInput.encode(updatedBonus)
      );

      const replaceBonusActivityResult = decodeOrThrowApplicationError(
        ReplaceBonusActivityResult,
        replaceBonusActivityResultUnencoded,
        "Error decoding ReplaceBonusActivity result"
      );

      if (replaceBonusActivityResult.kind === "FAILURE") {
        throw new ApplicationError(
          replaceBonusActivityResult.reason,
          "", // No details
          false
        );
      }
      //#endregion

      trackEvent({
        name: "TEST_PROCESS_REDEEMED_BONUS_SUCCESS"
      });

      return true;
    } catch (e) {
      contextErrorLogger(e);
      trackException(applicationErrorToExceptionTelemetry(e));
      if (e instanceof Error) {
        yield context.df.callActivity(
          "SaveErrorActivity",
          SaveErrorActivityInput.encode({
            id: redeemedBonus.bonus_code,

            requestId: `${redeemedRequestBlob.directory}/${redeemedRequestBlob.name}`,

            requestPayload: JSON.stringify(redeemedBonus),

            message: e.message
          })
        );
      }

      return false;
    }
  };
