import * as t from "io-ts";

import { Context } from "@azure/functions";

import { BonusActivation } from "../models/bonus_activation";
import { decodeOrThrowApplicationError } from "../utils/decode";
import { ApplicationError } from "../utils/errors";
import { GetContextErrorLoggerT } from "../utils/loggers";
import { RetrieveBonusActivationTaskT } from "./";

export const ActivityInput = BonusActivation;

export type ActivityInput = t.TypeOf<typeof ActivityInput>;

export const ActivityResultFailure = t.interface({
  kind: t.literal("FAILURE"),
  reason: t.string
});
export type ActivityResultFailure = t.TypeOf<typeof ActivityResultFailure>;

export const ActivityResultSuccess = t.interface({
  kind: t.literal("SUCCESS")
});
export type ActivityResultSuccess = t.TypeOf<typeof ActivityResultSuccess>;

export const ActivityResult = t.taggedUnion("kind", [
  ActivityResultFailure,
  ActivityResultSuccess
]);
export type ActivityResult = t.TypeOf<typeof ActivityResult>;

const failure = (reason: string): ActivityResult => ({
  kind: "FAILURE",
  reason
});

const success = (): ActivityResult => ({
  kind: "SUCCESS"
});

const logPrefix = "ReplaceBonusActivity";

/**
 * Replace the bonus in the db
 */
export const getReplaceBonusActivityHandler = (
  getContextErrorLogger: GetContextErrorLoggerT,
  replaceBonusActivationTask: ReturnType<RetrieveBonusActivationTaskT>
) => {
  return async (context: Context, input: unknown): Promise<ActivityResult> => {
    const contextErrorLogger = getContextErrorLogger(context, logPrefix);

    context.log.verbose(`${logPrefix}|Activity started`);

    try {
      const bonusActivation = decodeOrThrowApplicationError(
        ActivityInput,
        input,
        "Error decoding input"
      );

      return await replaceBonusActivationTask(bonusActivation)
        .fold(
          err => {
            throw new ApplicationError(
              `Error replacing BonusActivation: ${err.message}`,
              err.message,
              true
            );
          },
          () => success()
        )
        .run();
    } catch (e) {
      contextErrorLogger(e);

      if (e instanceof ApplicationError) {
        if (e.rethrow) {
          // Rethrow
          throw e;
        }

        return failure(e.message);
      }

      // Unhandled error, just rethrow
      throw e;
    }
  };
};
