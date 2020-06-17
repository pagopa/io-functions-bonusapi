import { isLeft } from "fp-ts/lib/Either";
import * as t from "io-ts";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { IOrchestrationFunctionContext } from "durable-functions/lib/src/classes";

import { RedeemedBonus } from "../generated/definitions/RedeemedBonus";

export const OrchestratorInput = t.interface({
  redeemedBonus: RedeemedBonus,
  requestId: t.string
});

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

  // STEP 1: Find the bonus in the db

  // STEP 2: Set the bonus status to redeemed

  // STEP 3: Send a message to notify th user the bonus has been redeemed

  return true;
};
