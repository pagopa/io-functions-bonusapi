// tslint:disable no-big-function

import * as t from "io-ts";

import { IOrchestrationFunctionContext } from "durable-functions/lib/src/classes";

import { FiscalCode } from "italia-ts-commons/lib/strings";

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
import {
  ActivityInput as SendMessageActivityInput,
  ActivityResult as SendMessageActivityResult
} from "../SendMessageActivity/handler";
import { TrackEventT, TrackExceptionT } from "../utils/appinsights";
import { decodeOrThrowApplicationError } from "../utils/decode";
import {
  ApplicationError,
  applicationErrorToExceptionTelemetry
} from "../utils/errors";
import { GetContextErrorLoggerT } from "../utils/loggers";
import { getRedeemedBonusMessageContent } from "../utils/messages";
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
    const ifNoInReplay = (fn: () => unknown) => {
      if (!context.df.isReplaying) {
        fn();
      }
    };

    ifNoInReplay(() => context.log(`${logPrefix}|Orchestrator started`));

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

    const { redeemedBonus, redeemedRequestReference } = orchestratorInput;

    const tagOverrides = {
      "ai.operation.id": redeemedBonus.bonus_code,
      "ai.operation.parentId": redeemedRequestReference.requestId
    };

    try {
      ifNoInReplay(() =>
        trackEvent({
          name: "bonusapi.redeemedbonusmessage.process.started",
          properties: {
            ...redeemedBonus,
            ...redeemedRequestReference
          },
          tagOverrides
        })
      );

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

      ifNoInReplay(() =>
        trackEvent({
          name: "bonusapi.redeemedbonusmessage.bonusread.success",
          properties: {
            ...redeemedBonus,
            ...redeemedRequestReference
          },
          tagOverrides
        })
      );
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
      ifNoInReplay(() =>
        trackEvent({
          name: "bonusapi.redeemedbonusmessage.bonusreplace.success",
          properties: {
            ...redeemedBonus,
            ...redeemedRequestReference
          },
          tagOverrides
        })
      );

      //#endregion

      //#region
      // STEP 5: Send notification messages
      // Retrieve the list of the fiscalcodes and sort using localCompare
      const fiscalCodes = bonus.dsuRequest.familyMembers
        .map(_ => _.fiscalCode)
        .sort((a, b) => a.localeCompare(b));

      // tslint:disable-next-line: readonly-array
      const failedNotifications: FiscalCode[] = [];
      // For each member send a notification message
      for (const fiscalCode of fiscalCodes) {
        try {
          const sendMessageActivityResultUnencoded = yield context.df.callActivityWithRetry(
            "SendMessageActivity",
            {
              backoffCoefficient: 1.5,
              firstRetryIntervalInMilliseconds: 1000,
              maxNumberOfAttempts: 10,
              maxRetryIntervalInMilliseconds: 3600 * 100,
              retryTimeoutInMilliseconds: 3600 * 1000
            },
            SendMessageActivityInput.encode({
              checkProfile: true,
              content: getRedeemedBonusMessageContent(
                redeemedBonus.redeemed_at
              ),
              fiscalCode
            })
          );

          const sendMessageActivityResult = decodeOrThrowApplicationError(
            SendMessageActivityResult,
            sendMessageActivityResultUnencoded,
            "Error decoding SendMessageActivity result"
          );

          if (sendMessageActivityResult.kind === "FAILURE") {
            throw new Error();
          }
        } catch (e) {
          // If we are here the SendMessageActivity has failed or reached max-retry
          // We add the fiscalcode to the failures
          failedNotifications.push(fiscalCode);
        }
      }

      if (failedNotifications.length > 0) {
        // One of the notifications failed
        throw new ApplicationError(
          `Error sending notifications to [${failedNotifications.join(",")}]`,
          "",
          false
        );
      }
      ifNoInReplay(() =>
        trackEvent({
          name: "bonusapi.redeemedbonusmessage.bonusnotify.success",
          properties: {
            ...redeemedBonus,
            ...redeemedRequestReference
          },
          tagOverrides
        })
      );

      //#endregion

      // Final result
      ifNoInReplay(() =>
        trackEvent({
          name: "bonusapi.redeemedbonusmessage.process.success",
          properties: {
            ...redeemedBonus,
            ...redeemedRequestReference
          },
          tagOverrides
        })
      );

      return true;
    } catch (e) {
      contextErrorLogger(e);

      // Final result
      ifNoInReplay(() =>
        trackException({
          exception: Error("bonusapi.redeemedbonusmessage.process.exception"),
          properties: {
            ...redeemedBonus,
            ...redeemedRequestReference,
            errorMessage: e.message,
            remedy: "Need valuation"
          },
          tagOverrides
        })
      );

      ifNoInReplay(() =>
        trackEvent({
          name: "bonusapi.redeemedbonusmessage.process.failure",
          properties: {
            ...redeemedBonus,
            ...redeemedRequestReference,
            errorMessage: e.message
          },
          tagOverrides
        })
      );

      // Try to save the error also in the storage table
      if (e instanceof Error) {
        yield context.df.callActivity(
          "SaveErrorActivity",
          SaveErrorActivityInput.encode({
            id: redeemedBonus.bonus_code,

            requestId: `${redeemedRequestReference.requestDate}/${redeemedRequestReference.requestId}.json`,

            requestPayload: JSON.stringify(redeemedBonus),

            message: e.message
          })
        );
      }

      return false;
    }
  };
