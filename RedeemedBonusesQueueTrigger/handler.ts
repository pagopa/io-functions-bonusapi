import { AzureFunction } from "@azure/functions";
import * as df from "durable-functions";

import { OrchestratorInput as ProcessRedeemedBonusMessageOrchestratorInput } from "../ProcessRedeemedBonusMessageOrchestrator/handler";
import { TrackEventT, TrackExceptionT } from "../utils/appinsights";
import { decodeOrThrowApplicationError } from "../utils/decode";
import { RedeemedBonusMessage } from "../utils/types";

/**
 * Listen to new message from the queue and for each start the orchestrator that process it
 */
export const getHandler = (
  trackException: TrackExceptionT,
  trackEvent: TrackEventT
): AzureFunction => async (
  context,
  inRedeemedBonusesQueueItem
): Promise<void> => {
  const redeemedBonusMessage = decodeOrThrowApplicationError(
    RedeemedBonusMessage,
    inRedeemedBonusesQueueItem
  );

  const { redeemedBonus, redeemedRequestReference } = redeemedBonusMessage;

  const tagOverrides = {
    "ai.operation.id": redeemedBonus.bonus_code,
    "ai.operation.parentId": redeemedRequestReference.requestId
  };

  trackEvent({
    name: "bonusapi.redeemedbonusmessage.received",
    properties: {
      ...redeemedBonus,
      ...redeemedRequestReference
    },
    tagOverrides
  });

  // Try to create a new orchestrator to handle the request
  try {
    const client = df.getClient(context);
    await client.startNew(
      "ProcessRedeemedBonusMessageOrchestrator",
      undefined,
      ProcessRedeemedBonusMessageOrchestratorInput.encode(redeemedBonusMessage)
    );
    trackEvent({
      name: "bonusapi.redeemedbonusmessage.enqueue.success",
      properties: {
        ...redeemedBonus,
        ...redeemedRequestReference
      },
      tagOverrides
    });
  } catch (e) {
    trackException({
      exception: Error("bonusapi.redeemedbonusmessage.enqueue.exception"),
      properties: {
        ...redeemedBonus,
        ...redeemedRequestReference,
        errorMessage: e.message,
        remedy: "Reinsert the message in the queue"
      },
      tagOverrides
    });
    trackEvent({
      name: "bonusapi.redeemedbonusmessage.enqueue.failure",
      properties: {
        ...redeemedBonus,
        ...redeemedRequestReference,
        errorMessage: e.message
      },
      tagOverrides
    });
  }

  context.done();
};
