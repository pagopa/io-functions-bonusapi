import * as t from "io-ts";

import { Context } from "@azure/functions";

import { RedeemedRequest } from "../generated/definitions/RedeemedRequest";
import { decodeOrThrowApplicationError } from "../utils/decode";
import { RedeemedBonusMessage, RedeemedRequestReference } from "../utils/types";

export const ActivityInput = RedeemedRequestReference;
export type ActivityInput = t.TypeOf<typeof ActivityInput>;

/**
 * Get the items from the blob and for each create a new message in the queue
 */
export const getSaveRedeemedRequestAsMessagesActivity = () => {
  return async (context: Context, input: unknown): Promise<void> => {
    // Decode the input
    const redeemedRequestReference = decodeOrThrowApplicationError(
      RedeemedRequestReference,
      input
    );

    // Get and decode the blob from the binding
    const redeemedRequest = decodeOrThrowApplicationError(
      RedeemedRequest,
      context.bindings.inRedeemedRequestBlob
    );

    // Map each message to add a reference to the blob
    const redeemedBonusesMessages: ReadonlyArray<RedeemedBonusMessage> = redeemedRequest.items.map(
      redeemedBonus => ({
        redeemedBonus,
        redeemedRequestReference
      })
    );

    // Insert te messages in the queue using the output binding
    // tslint:disable-next-line: no-object-mutation
    context.bindings.outRedeemedBonusesQueueItems = redeemedBonusesMessages;
    context.done();
  };
};
