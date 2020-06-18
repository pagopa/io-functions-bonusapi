import * as t from "io-ts";

import { UTCISODateFromString } from "italia-ts-commons/lib/dates";
import { enumType } from "italia-ts-commons/lib/types";

export const BONUS_ACTIVATION_COLLECTION_NAME = "bonus-activations";

export enum BonusActivationStatusEnum {
  "PROCESSING" = "PROCESSING",

  "ACTIVE" = "ACTIVE",

  "FAILED" = "FAILED",

  "REDEEMED" = "REDEEMED"
}

/**
 * Bonus activation status.
 * - PROCESSING  The bonus activation has started;
 *               this status is only needed when listing bonus id
 *               and does not appear in the bonus details
 *               since the request will return HTTP 202 in that case
 * - ACTIVE      The bonus has been successfully activated;
 *               the bonus activtion procedure can't be restarted anymore
 * - FAILED      The bonus activation procedure failed and can be restarted
 * - REDEEMED    The bonus is redeemed by the user or by any member of the family;
 *               the bonus activtion procedure can't be restarted anymore
 */

export type BonusActivationStatus = t.TypeOf<typeof BonusActivationStatus>;
export const BonusActivationStatus = enumType<BonusActivationStatusEnum>(
  BonusActivationStatusEnum,
  "BonusActivationStatus"
);

export const BonusActivation = t.intersection([
  t.interface({
    id: t.string,
    status: BonusActivationStatus
  }),
  t.partial({
    redeemedAt: UTCISODateFromString
  })
]);
export type BonusActivation = t.TypeOf<typeof BonusActivation>;
