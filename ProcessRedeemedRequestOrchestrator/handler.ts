import { isLeft } from "fp-ts/lib/Either";
import * as t from "io-ts";

import {
  IOrchestrationFunctionContext,
  Task
} from "durable-functions/lib/src/classes";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { RedeemedRequest } from "../generated/definitions/RedeemedRequest";
import { OrchestratorInput as ProcessRedeemedBonusOrchestratorInput } from "../ProcessRedeemedBonusOrchestrator/handler";
import { ActivityInput as SaveRequestActivityInput } from "../SaveRequestActivity/handler";

export const OrchestratorInput = RedeemedRequest;

export type OrchestratorInput = t.TypeOf<typeof OrchestratorInput>;

export const handler = function*(
  context: IOrchestrationFunctionContext
): Generator {
  const logPrefix = "ProcessRedeemedRequestOrchestrator";
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

  const redeemedRequest = errorOrOrchestratorInput.value;

  const utcISOString = context.df.currentUtcDateTime.toISOString();
  const orchestratorId = context.df.instanceId;
  const requestId = `${utcISOString}-${orchestratorId}`;

  // STEP 1: Try to store the request as blob
  // It will be useful if the db get corrupted to have a backup of all the requests.
  // In case of error we don't want to stop the process.
  try {
    // TODO: Add retry?
    yield context.df.callActivity(
      "SaveRequestActivity",
      SaveRequestActivityInput.encode({
        redeemedRequest,
        requestId
      })
    );
  } catch (e) {
    // Log already done in the activity
  }

  // STEP 2: Create an suborchestrator task for each bonus redeemed
  // tslint:disable-next-line: readonly-array
  const tasks: Task[] = [];
  for (const redeemedBonus of redeemedRequest.items) {
    tasks.push(
      context.df.callSubOrchestrator(
        "ProcessRedeemedBonusOrchestrator",
        ProcessRedeemedBonusOrchestratorInput.encode({
          redeemedBonus,
          requestId
        })
      )
    );
  }

  // Start all tasks in parallel
  yield context.df.Task.all(tasks);

  // TODO: Handle results

  return true;
};
