import * as t from "io-ts";
import { RedeemedBonus } from "../generated/definitions/RedeemedBonus";

/**
 * A type for the reference to the request
 */
export const RedeemedRequestReference = t.interface({
  requestId: t.string,

  requestDate: t.string
});
export type RedeemedRequestReference = t.TypeOf<
  typeof RedeemedRequestReference
>;

/**
 * A type for message inserted in the storage queue.
 * We store:
 *  - the redeemed bonus info
 *  - the reference to the redeemed request originally containing the redeemed bonus info
 */
export const RedeemedBonusMessage = t.interface({
  redeemedBonus: RedeemedBonus,
  redeemedRequestReference: RedeemedRequestReference
});
export type RedeemedBonusMessage = t.TypeOf<typeof RedeemedBonusMessage>;

/**
 * Get the path where the request is stored as blob
 */
export const getRedeemedRequestBlobPath = (
  requestDate: string,
  requestId: string
) => `${requestDate}/${requestId}.json`;
