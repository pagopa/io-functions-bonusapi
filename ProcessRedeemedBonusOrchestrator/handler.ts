import { isLeft } from "fp-ts/lib/Either";
import * as t from "io-ts";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { IOrchestrationFunctionContext } from "durable-functions/lib/src/classes";

import { RedeemedBonus } from "../generated/definitions/RedeemedBonus";
import { BonusActivationStatusEnum } from "../generated/models/BonusActivationStatus";
import {
  ActivityInput as RetrieveBonusActivityInput,
  ActivityResult as RetrieveBonusActivityResult
} from "../RetrieveBonusActivity/handler";

export const OrchestratorInput = RedeemedBonus;

export type OrchestratorInput = t.TypeOf<typeof OrchestratorInput>;

export const handler = function*(
  context: IOrchestrationFunctionContext
): Generator {
  const logPrefix = "ProcessRedeemedBonusOrchestrator";
  // Get and decode orchestrator input
  const input = context.df.getInput();
  const errorOrOrchestratorInput = OrchestratorInput.decode(input);

  if (isLeft(errorOrOrchestratorInput)) {
    context.log.error(`${logPrefix}|Error decoding input`);
    context.log.error(
      `${logPrefix}|Error decoding input|ERROR=${readableReport(
        errorOrOrchestratorInput.value
      )}`
    );
    return false;
  }

  const redeemedBonus = errorOrOrchestratorInput.value;

  // STEP 1: Find the bonus in the db
  const retrieveBonusActivityResultUnencoded = yield context.df.callActivity(
    "RetrieveBonusActivity",
    RetrieveBonusActivityInput.encode({
      bonusID: redeemedBonus.bonus_code
    })
  );

  const errorOrRetrieveBonusActivityResult = RetrieveBonusActivityResult.decode(
    retrieveBonusActivityResultUnencoded
  );

  if (isLeft(errorOrRetrieveBonusActivityResult)) {
    // Unrecoverable error, just log and return
    context.log.error(
      `${logPrefix}|Error decoding RetrieveBonusActivity result`
    );
    context.log.verbose(
      `${logPrefix}|Error decoding RetrieveBonusActivity result|ERROR=${readableReport(
        errorOrRetrieveBonusActivityResult.value
      )}`
    );
    return false;
  }

  const retrieveBonusActivityResult = errorOrRetrieveBonusActivityResult.value;

  if (retrieveBonusActivityResult.kind === "FAILURE") {
    // Unrecoverable error, just log and return
    context.log.error(
      `${logPrefix}|Error in RetrieveBonusActivity|ERROR=${retrieveBonusActivityResult.reason}`
    );
    return false;
  }

  if (retrieveBonusActivityResult.kind === "SUCCESS_BONUS_NOT_FOUND") {
    // The bonus doesn't exists
    // TODO: Save the error somewhere to be analyzed
    context.log.error(`${logPrefix}|The bonus doesn't exists`);
    return false;
  }

  const bonus = retrieveBonusActivityResult.bonus;

  if (bonus.status !== BonusActivationStatusEnum.ACTIVE) {
    // We can't set as redeemed a bonus that is not active
    // TODO: Save the error somewhere to be analyzed
    context.log.error(
      `${logPrefix}|The bonus is not active|STATUS=${bonus.status}`
    );
    return false;
  }

  // STEP 2: Set the bonus status to redeemed

  // STEP 3: Send a message to notify th user the bonus has been redeemed

  return true;
};
