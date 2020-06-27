import * as t from "io-ts";
import { RedeemedBonus } from "../generated/definitions/RedeemedBonus";

export const RedeemedRequestBlob = t.interface({
  // The directory where the request blob is stored
  directory: t.string,
  // The name of the request blob
  name: t.string
});
export type RedeemedRequestBlob = t.TypeOf<typeof RedeemedRequestBlob>;

export const RedeemedBonusMessage = t.interface({
  redeemedBonus: RedeemedBonus,
  redeemedRequestBlob: RedeemedRequestBlob
});
export type RedeemedBonusMessage = t.TypeOf<typeof RedeemedBonusMessage>;
