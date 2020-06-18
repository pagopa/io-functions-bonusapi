import { Option } from "fp-ts/lib/Option";
import { fromEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";

import { Context } from "@azure/functions";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { ReadBonusActivationTaskT } from ".";
import { BonusActivation } from "../models/bonus_activation";

export const ActivityInput = t.interface({
  bonusID: t.string
});

export type ActivityInput = t.TypeOf<typeof ActivityInput>;

export const ActivityResultFailure = t.interface({
  kind: t.literal("FAILURE"),
  reason: t.string
});
export type ActivityResultFailure = t.TypeOf<typeof ActivityResultFailure>;

export const ActivityResultSuccessNotFound = t.interface({
  kind: t.literal("SUCCESS_BONUS_NOT_FOUND")
});
export type ActivityResultSuccessNotFound = t.TypeOf<
  typeof ActivityResultSuccessNotFound
>;

export const ActivityResultSuccessFound = t.interface({
  bonus: BonusActivation,
  kind: t.literal("SUCCESS_BONUS_FOUND")
});
export type ActivityResultSuccessFound = t.TypeOf<
  typeof ActivityResultSuccessFound
>;

export const ActivityResult = t.taggedUnion("kind", [
  ActivityResultFailure,
  ActivityResultSuccessNotFound,
  ActivityResultSuccessFound
]);
export type ActivityResult = t.TypeOf<typeof ActivityResult>;

const failure = (reason: string): ActivityResult => ({
  kind: "FAILURE",
  reason
});

const success = (maybeBonusActivation: Option<BonusActivation>) =>
  maybeBonusActivation.foldL<ActivityResult>(
    () => ({
      kind: "SUCCESS_BONUS_NOT_FOUND"
    }),
    bonusActivation => ({
      bonus: bonusActivation,
      kind: "SUCCESS_BONUS_FOUND"
    })
  );

/**
 * Read the bonus from the db
 */
export const getReadBonusActivityHandler = (
  readBonusActivationTask: ReturnType<ReadBonusActivationTaskT>
) => {
  return async (context: Context, input: unknown): Promise<ActivityResult> => {
    const logPrefix = "ReadBonusActivity";

    context.log.verbose(`${logPrefix}|INFO|Input: ${input}`);

    return await fromEither(
      // Decode input
      ActivityInput.decode(input).mapLeft(
        errs =>
          new Error(
            `${logPrefix}|Cannot decode input|ERROR=${readableReport(
              errs
            )}|INPUT=${JSON.stringify(input)}`
          )
      )
    )
      .chain(({ bonusID }) => readBonusActivationTask(bonusID))
      .fold<ActivityResult>(error => failure(error.message), success)
      .run();
  };
};
