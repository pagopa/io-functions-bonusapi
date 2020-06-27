import { AzureFunction, Context } from "@azure/functions";
import * as df from "durable-functions";

import { OrchestratorInput as ProcessRedeemedBonusMessageOrchestratorInput } from "../ProcessRedeemedBonusMessageOrchestrator/handler";
import { decodeOrThrowApplicationError } from "../utils/decode";
import { RedeemedBonusMessage } from "../utils/types";

/**
 * Listen to new message from the queue and for each start the orchestrator that process it
 */
export const index: AzureFunction = async (
  context: Context,
  inRedeemedBonusesQueueItem: unknown
): Promise<void> => {
  const redeemedBonusMessage = decodeOrThrowApplicationError(
    RedeemedBonusMessage,
    inRedeemedBonusesQueueItem
  );

  const client = df.getClient(context);

  await client.startNew(
    "ProcessRedeemedBonusMessageOrchestrator",
    undefined,
    ProcessRedeemedBonusMessageOrchestratorInput.encode(redeemedBonusMessage)
  );

  context.done();
};
