import { isLeft } from "fp-ts/lib/Either";
import * as t from "io-ts";

import {
  IOrchestrationFunctionContext,
  Task
} from "durable-functions/lib/src/classes";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { RedeemedBonuses } from "../generated/definitions/RedeemedBonuses";
import { ActivityInput as SetBonusAsRedeemedActivityInput } from "../SetBonusAsRedeemedActivity/handler";

export const OrchestratorInput = RedeemedBonuses;

export type OrchestratorInput = t.TypeOf<typeof OrchestratorInput>;

export const handler = function*(
  context: IOrchestrationFunctionContext
): Generator {
  const logPrefix = "SetBonusesAsRedeemedOrchestrator";
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

  const orchestratorInput = errorOrOrchestratorInput.value;

  // Create an activity task for each bonus redeemed
  // tslint:disable-next-line: readonly-array
  const tasks: Task[] = [];
  for (const bonusRedeemed of orchestratorInput.items) {
    tasks.push(
      context.df.callActivity(
        "SetBonusAsRedeemedActivity",
        SetBonusAsRedeemedActivityInput.encode(bonusRedeemed)
      )
    );
  }

  // Start all tasks in parallel
  yield context.df.Task.all(tasks);

  // TODO: Handle results

  return true;
};
