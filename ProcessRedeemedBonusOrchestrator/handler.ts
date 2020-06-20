import { Either, isLeft, left, right } from "fp-ts/lib/Either";
import * as t from "io-ts";

import { IOrchestrationFunctionContext } from "durable-functions/lib/src/classes";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { RedeemedBonus } from "../generated/definitions/RedeemedBonus";
import {
  BonusActivation,
  BonusActivationStatusEnum
} from "../models/bonus_activation";
import {
  ActivityInput as ReadBonusActivityInput,
  ActivityResult as ReadBonusActivityResult
} from "../ReadBonusActivity/handler";
import { ActivityResult as ReplaceBonusActivityResult } from "../ReplaceBonusActivity/handler";
import { ActivityInput as SendMessageActivityInput } from "../SendMessageActivity/handler";
import { TrackEventT } from "../utils/appinsights";
import { getRedeemedBonusMessageContent } from "../utils/messages";

export const OrchestratorInput = t.interface({
  redeemedBonus: RedeemedBonus,
  requestId: t.string
});

export type OrchestratorInput = t.TypeOf<typeof OrchestratorInput>;

/**
 * A structure best suited for log purpose:
 * - errorMessage is used for log.error and log.verbose
 * - errorDetail is only used for log.verbose and is useful for
 *   deep debugging
 */
interface IHandlerError {
  errorMessage: string;
  errorDetail: string;
}

/**
 * Utility method to create a HandlerError structure
 * @param errorMessage
 * @param errorDetail
 */
const getHandlerError = (
  errorMessage: string,
  errorDetail: string
): IHandlerError => ({
  errorDetail,
  errorMessage
});

/**
 * Log using the orchestrator context
 */
const getLogHandlerError = (
  context: IOrchestrationFunctionContext,
  logPrefix: string
) => (handlerError: IHandlerError) => {
  if (!context.df.isReplaying) {
    context.log.error(`${logPrefix}|${handlerError.errorMessage}`);
    context.log.verbose(
      `${logPrefix}|${handlerError.errorMessage}|ERROR=${handlerError.errorDetail}`
    );
  }
};

/**
 * Transform a decode errors to HandlerError
 */
const handleErrorFromDecodeErrors = (errs: ReadonlyArray<t.ValidationError>) =>
  getHandlerError("Decode error", readableReport(errs));

/**
 * Process the redemption of a single bonus
 */
export const getHandler = (trackEvent: TrackEventT) =>
  function*(context: IOrchestrationFunctionContext): Generator {
    const logPrefix = "ProcessRedeemedBonusOrchestrator";
    const logHandlerError = getLogHandlerError(context, logPrefix);

    // Get and decode orchestrator input
    const input = context.df.getInput();
    const errorOrOrchestratorInput = OrchestratorInput.decode(input);

    if (isLeft(errorOrOrchestratorInput)) {
      logHandlerError({
        errorDetail: readableReport(errorOrOrchestratorInput.value),
        errorMessage: "Error decoding input"
      });
      trackEvent({
        name: "TEST_PROCESS_REDEEMED_BONUS_FAILURE"
      });
      return false;
    }

    // Now we have the orchestrator input
    const { redeemedBonus, requestId } = errorOrOrchestratorInput.value;

    const trackProcessError = () =>
      trackEvent({
        name: "TEST_PROCESS_REDEEMED_BONUS_FAILURE",
        properties: {
          requestId
        }
      });

    // STEP 1: Read the bonus from the db
    const readBonusActivityResultUnencoded = yield context.df.callActivity(
      "ReadBonusActivity",
      ReadBonusActivityInput.encode({
        bonusID: redeemedBonus.bonus_code
      })
    );

    const readHandlerResult: Either<
      IHandlerError,
      BonusActivation
    > = ReadBonusActivityResult.decode(readBonusActivityResultUnencoded)
      .mapLeft(handleErrorFromDecodeErrors)
      .chain(_ => {
        switch (_.kind) {
          case "FAILURE":
            return left(getHandlerError("Error in activity", _.reason));

          case "SUCCESS_BONUS_NOT_FOUND":
            return left(getHandlerError("Bonus not found", ""));

          default:
            return right(_.bonus);
        }
      });

    if (isLeft(readHandlerResult)) {
      const error = readHandlerResult.value;
      // TODO: Save the error to be inspected
      logHandlerError(error);
      trackProcessError();
      return false;
    }

    // Now we have the bonus
    const bonus = readHandlerResult.value;

    // STEP 2: Check the status of the bonus
    if (bonus.status !== BonusActivationStatusEnum.ACTIVE) {
      // If the status of the bonus is not active we cant proceed
      // TODO: Save the error to be inspected
      logHandlerError({
        errorDetail: bonus.status,
        errorMessage: "Bonus is not active"
      });
      trackProcessError();
      return false;
    }

    // Ok we have the bonus and the status is ACTIVE

    // STEP 3: Create a copy of the bonus in a redeemed state
    const updatedBonus: BonusActivation = {
      ...bonus,
      redeemedAt: redeemedBonus.redeemed_at,
      status: BonusActivationStatusEnum.REDEEMED
    };

    // STEP 4: Replace the bonus in the db with the new version
    const replaceBonusActivityResultUnencoded = yield context.df.callActivity(
      "ReplaceBonusActivity",
      BonusActivation.encode(updatedBonus)
    );

    const replaceHandlerResult: Either<
      IHandlerError,
      number
    > = ReplaceBonusActivityResult.decode(replaceBonusActivityResultUnencoded)
      .mapLeft(handleErrorFromDecodeErrors)
      .chain(_ => {
        return _.kind === "FAILURE"
          ? left(getHandlerError("Error in activity", _.reason))
          : right(0);
      });

    if (isLeft(replaceHandlerResult)) {
      const error = replaceHandlerResult.value;
      // TODO: Save the error to be inspected
      logHandlerError(error);
      trackProcessError();
      return false;
    }

    // STEP 5: Track an event using Application Insights
    if (!context.df.isReplaying) {
      trackEvent({
        name: "TEST_PROCESS_REDEEMED_BONUS_SUCCESS"
      });
    }

    // STEP 6: Send messages
    // Retrieve the list of the fiscalcodes and sort using localCompare
    const fiscalCodes = bonus.dsuRequest.familyMembers
      .map(_ => _.fiscalCode)
      .sort((a, b) => a.localeCompare(b));

    for (const fiscalCode of fiscalCodes) {
      yield context.df.callActivityWithRetry(
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
          content: getRedeemedBonusMessageContent(redeemedBonus.redeemed_at),
          fiscalCode
        })
      );
    }

    return true;
  };
