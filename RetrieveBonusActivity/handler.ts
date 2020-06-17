import * as t from "io-ts";

import { Context } from "@azure/functions";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { RedeemedBonus } from "../generated/definitions/RedeemedBonus";
import { BonusActivation } from "../models/bonus_activation";

export const ActivityInput = RedeemedBonus;

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

const failure = (reason: string): ActivityResultFailure =>
  ActivityResultFailure.encode({
    kind: "FAILURE",
    reason
  });

const success = (bonus: BonusActivation): ActivityResultSuccess =>
  ActivityResultSuccess.encode({
    bonus,
    kind: "SUCCESS"
  });

/**
 * Retrieve bonus using the input binding defined in function.json file.
 */
export const getRetrieveBonusActivityHandler = () => {
  // tslint:disable-next-line: no-object-mutation
  return async (context: Context, input: unknown): Promise<ActivityResult> => {
    const logPrefix = "RetrieveBonusActivity";
    return ActivityInput.decode(input).fold<ActivityResult>(
      errs => {
        context.log.error(`${logPrefix}|Error decoding input`);
        context.log.verbose(
          `${logPrefix}|Error decoding input|ERROR=${readableReport(errs)}`
        );
        return failure("Cant decode input");
      },
      redeemedBonus =>
        BonusActivation.decode(redeemedBonus).fold<ActivityResult>(
          errs => {
            context.log.error(`${logPrefix}|Error decoding input`);
            context.log.verbose(
              `${logPrefix}|Error decoding BonusActivation|ERROR=${readableReport(
                errs
              )}`
            );
            return failure("Cant decode BonusActivation");
          },
          bonusActivation => {
            return success(bonusActivation);
          }
        )
    );
  };
};
