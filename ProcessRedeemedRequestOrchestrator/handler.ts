import * as t from "io-ts";

import { IOrchestrationFunctionContext } from "durable-functions/lib/src/classes";

import { ActivityInput as SaveRedeemedRequestAsMessagesActivityInput } from "../SaveRedeemedRequestAsMessagesActivity/handler";
import { decodeOrThrowApplicationError } from "../utils/decode";
import { RedeemedRequestBlob } from "../utils/types";

export const OrchestratorInput = RedeemedRequestBlob;

export type OrchestratorInput = t.TypeOf<typeof OrchestratorInput>;

const logPrefix = "ProcessRedeemedRequestOrchestrator";

/**
 * Handle the new request saved as blob
 */
export const getHandler = () =>
  function*(context: IOrchestrationFunctionContext): Generator {
    context.log.verbose(`${logPrefix}|Orchestrator started`);
    // Get and decode orchestrator input
    const redeemedRequestBlob = decodeOrThrowApplicationError(
      OrchestratorInput,
      context.df.getInput(),
      "Error decoding input"
    );

    // Call an activity to iterate the items in the blob and save each as storage queue message
    yield context.df.callActivity(
      "SaveRedeemedRequestAsMessagesActivity",
      SaveRedeemedRequestAsMessagesActivityInput.encode(redeemedRequestBlob)
    );

    return true;
  };
