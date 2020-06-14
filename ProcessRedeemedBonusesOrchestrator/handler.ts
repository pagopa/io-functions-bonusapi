import { isLeft } from "fp-ts/lib/Either";
import * as t from "io-ts";

import {
  IOrchestrationFunctionContext,
  Task
} from "durable-functions/lib/src/classes";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { RedeemedBonuses } from "../generated/definitions/RedeemedBonuses";
import { OrchestratorInput as ProcessRedeemedBonusOrchestratorInput } from "../ProcessRedeemedBonusOrchestrator/handler";

export const OrchestratorInput = RedeemedBonuses;

export type OrchestratorInput = t.TypeOf<typeof OrchestratorInput>;

export const handler = function*(
  context: IOrchestrationFunctionContext
): Generator {
  const logPrefix = "ProcessRedeemedBonusesOrchestrator";
  // Get and decode orchestrator input
  const input = context.df.getInput();
  const errorOrOrchestratorInput = OrchestratorInput.decode(input);

  if (isLeft(errorOrOrchestratorInput)) {
    context.log.error(`${logPrefix}|Error decoding input`);
    context.log.verbose(
      `${logPrefix}|Error decoding input|ERROR=${readableReport(
        errorOrOrchestratorInput.value
      )}`
    );
    return false;
  }

  const redeemedBonuses = errorOrOrchestratorInput.value;

  // STEP 1: Try to store the request as blob
  // It will be useful if the db get corrupted to have a backup of all the requests.
  // In case of error we don't want to stop the process.
  try {
    // TODO: Add retry?
    yield context.df.callActivity("SaveRequestActivity", redeemedBonuses);
  } catch (e) {
    // Log already done in the activity
  }

  // STEP 2: Create an suborchestrator task for each bonus redeemed
  // tslint:disable-next-line: readonly-array
  const tasks: Task[] = [];
  for (const redeemedBonus of redeemedBonuses.items) {
    tasks.push(
      context.df.callSubOrchestrator(
        "ProcessRedeemedBonusOrchestrator",
        ProcessRedeemedBonusOrchestratorInput.encode(redeemedBonus)
      )
    );
  }

  // Start all tasks in parallel
  yield context.df.Task.all(tasks);

  // TODO: Handle results

  return true;
};
