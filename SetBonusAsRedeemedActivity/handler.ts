import * as t from "io-ts";

import { Context } from "@azure/functions";

import { RedeemedBonus } from "../generated/definitions/RedeemedBonus";

export const ActivityInput = RedeemedBonus;

export type ActivityInput = t.TypeOf<typeof ActivityInput>;

export const getSetBonusAsRedeemedActivityHandler = () => {
  return async (context: Context, input: unknown): Promise<unknown> => {
    context.log.info(`SetBonusAsRedeemedActivity|INFO|Input: ${input}`);

    // TODO: Add business logic

    return true;
  };
};
