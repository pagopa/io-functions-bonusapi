import { fromEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";

import { Context } from "@azure/functions";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { BonusActivation } from "../models/bonus_activation";
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

/**
 * Replace the bonus in the db
 */
export const getReplaceBonusActivityHandler = (
  replaceBonusActivationTask: ReturnType<RetrieveBonusActivationTaskT>
) => {
  return async (context: Context, input: unknown): Promise<ActivityResult> => {
    const logPrefix = "ReplaceBonusActivity";

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
      .chain(replaceBonusActivationTask)
      .fold<ActivityResult>(error => failure(error.message), success)
      .run();
  };
};
