import { MessageContent } from "io-functions-commons/dist/generated/definitions/MessageContent";
import { FiscalCode } from "italia-ts-commons/lib/strings";

import {
  BonusActivation,
  BonusActivationStatusEnum
} from "../models/bonus_activation";

export const aFiscalCode = "AAABBB80A01C123D" as FiscalCode;

export const aBonusActivation: BonusActivation = {
  id: "AAAAAAAAAAAA",

  dsuRequest: {
    familyMembers: [
      {
        fiscalCode: "AAAAAA00A00A000A" as FiscalCode
      },
      {
        fiscalCode: "AAAAAA00A00A000B" as FiscalCode
      },
      {
        fiscalCode: "AAAAAA00A00A000C" as FiscalCode
      }
    ]
  },

  status: BonusActivationStatusEnum.PROCESSING
};

export const aMessageContent = {
  markdown:
    "Message contentttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt",
  subject: "Message subject"
} as MessageContent;
