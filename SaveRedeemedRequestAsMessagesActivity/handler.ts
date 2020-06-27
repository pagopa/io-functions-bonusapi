import * as t from "io-ts";

import { Context } from "@azure/functions";

import { RedeemedRequest } from "../generated/definitions/RedeemedRequest";
import { decodeOrThrowApplicationError } from "../utils/decode";
import { RedeemedBonusMessage, RedeemedRequestBlob } from "../utils/types";

export const ActivityInput = RedeemedRequestBlob;
export type ActivityInput = t.TypeOf<typeof ActivityInput>;

/**
 * Get the items from the blob and for each create a new message in the queue
 */
export const getSaveRedeemedRequestAsMessagesActivity = () => {
  return async (context: Context, input: unknown): Promise<void> => {
    const redeemedRequestBlob = decodeOrThrowApplicationError(
      RedeemedRequestBlob,
      input
    );

    const redeemedRequest = decodeOrThrowApplicationError(
      RedeemedRequest,
      context.bindings.inRedeemedRequestBlob
    );

    const mappedRedeemedBonuses: ReadonlyArray<RedeemedBonusMessage> = redeemedRequest.items.map(
      redeemedBonus => ({
        redeemedBonus,
        redeemedRequestBlob
      })
    );

    // tslint:disable-next-line: no-object-mutation
    context.bindings.outRedeemedBonusesQueueItems = mappedRedeemedBonuses;
    context.done();
  };
};
