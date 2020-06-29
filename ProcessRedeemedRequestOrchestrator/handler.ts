import * as t from "io-ts";

import { IOrchestrationFunctionContext } from "durable-functions/lib/src/classes";

import { ActivityInput as SaveRedeemedRequestAsMessagesActivityInput } from "../SaveRedeemedRequestAsMessagesActivity/handler";
import { TrackEventT, TrackExceptionT } from "../utils/appinsights";
import { decodeOrThrowApplicationError } from "../utils/decode";
import { RedeemedRequestReference } from "../utils/types";

export const OrchestratorInput = RedeemedRequestReference;

export type OrchestratorInput = t.TypeOf<typeof OrchestratorInput>;

const logPrefix = "ProcessRedeemedRequestOrchestrator";

/**
 * Handle the new request saved as blob
 */
export const getHandler = (
  trackException: TrackExceptionT,
  trackEvent: TrackEventT
) =>
  function*(context: IOrchestrationFunctionContext): Generator {
    if (!context.df.isReplaying) {
      context.log.verbose(`${logPrefix}|Orchestrator started`);
    }

    // Get and decode orchestrator input
    const redeemedRequestReference = decodeOrThrowApplicationError(
      OrchestratorInput,
      context.df.getInput(),
      "Error decoding input"
    );

    const tagOverrides = {
      "ai.operation.id": redeemedRequestReference.requestId,
      "ai.operation.parentId": redeemedRequestReference.requestId
    };

    try {
      // Call an activity to iterate the items in the blob and save each as storage queue message
      yield context.df.callActivity(
        "SaveRedeemedRequestAsMessagesActivity",
        SaveRedeemedRequestAsMessagesActivityInput.encode(
          redeemedRequestReference
        )
      );

      trackEvent({
        name: "bonusapi.redeemedrequest.process.success",
        properties: {
          ...redeemedRequestReference
        },
        tagOverrides
      });

      return true;
    } catch (e) {
      trackException({
        exception: Error("bonusapi.redeemedrequest.process.exception"),
        properties: {
          ...redeemedRequestReference,
          errorMessage: e.message,
          remedy: "Reprocess the request staring the orchestrator manually"
        },
        tagOverrides
      });
      trackEvent({
        name: "bonusapi.redeemedrequest.processing.failure",
        properties: {
          ...redeemedRequestReference,
          errorMessage: e.message
        },
        tagOverrides
      });

      return false;
    }
  };
