import * as t from "io-ts";

import { Context } from "@azure/functions";

import { ReadBonusActivationTaskT } from ".";
import { BonusActivation } from "../models/bonus_activation";
import { decodeOrThrowApplicationError } from "../utils/decode";
import { ApplicationError } from "../utils/errors";

export const ActivityInput = t.interface({
  bonusId: t.string
});

export type ActivityInput = t.TypeOf<typeof ActivityInput>;

export const ActivityResultFailure = t.interface({
  kind: t.literal("FAILURE"),
  reason: t.string
});
export type ActivityResultFailure = t.TypeOf<typeof ActivityResultFailure>;

export const ActivityResultSuccess = t.interface({
  bonus: BonusActivation,
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

const success = (bonusActivation: BonusActivation): ActivityResult => ({
  bonus: bonusActivation,
  kind: "SUCCESS"
});

const logPrefix = "ReadBonusActivity";

/**
 * Read the bonus from the db
 */
export const getReadBonusActivityHandler = (
  readBonusActivationTask: ReturnType<ReadBonusActivationTaskT>
) => {
  return async (context: Context, input: unknown): Promise<ActivityResult> => {
    context.log.verbose(`${logPrefix}|Activity started`);

    try {
      const { bonusId } = decodeOrThrowApplicationError(
        ActivityInput,
        input,
        "Error decoding input"
      );

      return await readBonusActivationTask(bonusId)
        .fold(
          err => {
            throw new ApplicationError(
              "Error reading BonusActivation",
              err.message,
              true
            );
          },
          maybeBonusActivation =>
            maybeBonusActivation.foldL(() => {
              throw new ApplicationError(
                "Can't find BonusActivation",
                `ID=${bonusId}`,
                false
              );
            }, success)
        )
        .run();
    } catch (e) {
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
