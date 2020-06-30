import { isLeft } from "fp-ts/lib/Either";

import { Context } from "@azure/functions";
import { format } from "date-fns";
import * as df from "durable-functions";
import * as express from "express";
import { v4 } from "uuid";

import { ContextMiddleware } from "io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredBodyPayloadMiddleware } from "io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorInternal,
  IResponseSuccessAccepted,
  ResponseErrorInternal,
  ResponseSuccessAccepted
} from "italia-ts-commons/lib/responses";

import { UploadRedeemedRequestTaskT } from ".";
import { RedeemedRequest } from "../generated/definitions/RedeemedRequest";
import {
  RequestAccepted,
  StatusEnum
} from "../generated/definitions/RequestAccepted";
import { OrchestratorInput as ProcessRedeemedRequestOrchestratorInput } from "../ProcessRedeemedRequestOrchestrator/handler";
import { TrackEventT, TrackExceptionT } from "../utils/appinsights";
import {
  getRedeemedRequestBlobPath,
  RedeemedRequestReference
} from "../utils/types";

type IAcceptRedeemedRequestHandler = (
  context: Context,
  redeemedRequest: RedeemedRequest
) => Promise<
  IResponseSuccessAccepted<RequestAccepted> | IResponseErrorInternal
>;

/**
 * Handle the post request
 */
export function AcceptRedeemedRequestHandler(
  uploadRedeemedRequestTask: UploadRedeemedRequestTaskT,
  trackException: TrackExceptionT,
  trackEvent: TrackEventT
): IAcceptRedeemedRequestHandler {
  return async (context, redeemedRequest) => {
    // Create identification values for the request
    const requestDate = format(new Date(), "yyyy-MM-dd");
    const requestId = v4();
    const redeemedRequestReference: RedeemedRequestReference = {
      requestDate,
      requestId
    };
    const blobPath = getRedeemedRequestBlobPath(requestDate, requestId);

    const tagOverrides = {
      "ai.operation.id": requestId,
      "ai.operation.parentId": requestId
    };

    trackEvent({
      name: "bonusapi.redeemedrequest.received",
      properties: {
        ...redeemedRequestReference,
        number_of_redeemed_bonuses: String(redeemedRequest.items.length)
      },
      tagOverrides
    });

    // Save the request as blob
    const errorOrResponse = await uploadRedeemedRequestTask(
      blobPath,
      JSON.stringify(redeemedRequest)
    ).run();

    if (isLeft(errorOrResponse)) {
      trackEvent({
        name: "bonusapi.redeemedrequest.accept.failure",
        properties: {
          ...redeemedRequestReference,
          errorMessage: errorOrResponse.value.message
        },
        tagOverrides
      });
      return ResponseErrorInternal("Error accepting request");
    }

    trackEvent({
      name: "bonusapi.redeemedrequest.accept.success",
      properties: {
        ...redeemedRequestReference
      },
      tagOverrides
    });

    // Try to create a new orchestrator to handle the request
    try {
      const client = df.getClient(context);
      await client.startNew(
        "ProcessRedeemedRequestOrchestrator",
        undefined,
        ProcessRedeemedRequestOrchestratorInput.encode(redeemedRequestReference)
      );

      trackEvent({
        name: "bonusapi.redeemedrequest.enqueue.success",
        properties: {
          ...redeemedRequestReference
        },
        tagOverrides
      });
    } catch (e) {
      // A problem occurred while staring the Orchestrator
      // Track an exception so we can decide how to remediate
      trackException({
        exception: Error("bonusapi.redeemedrequest.enqueue.exception"),
        properties: {
          ...redeemedRequestReference,
          errorMessage: e.message,
          remedy: "Reprocess the request staring the orchestrator manually"
        },
        tagOverrides
      });
      trackEvent({
        name: "bonusapi.redeemedrequest.enqueue.failure",
        properties: {
          ...redeemedRequestReference,
          errorMessage: e.message
        },
        tagOverrides
      });
    }

    return ResponseSuccessAccepted(undefined, {
      status: StatusEnum.OK
    });
  };
}

export function AcceptRedeemedRequest(
  uploadRedeemedRequestTask: UploadRedeemedRequestTaskT,
  trackException: TrackExceptionT,
  trackEvent: TrackEventT
): express.RequestHandler {
  const handler = AcceptRedeemedRequestHandler(
    uploadRedeemedRequestTask,
    trackException,
    trackEvent
  );

  const middlewaresWrap = withRequestMiddlewares(
    // Extract Azure Functions bindings
    ContextMiddleware(),
    RequiredBodyPayloadMiddleware(RedeemedRequest)
  );

  return wrapRequestHandler(middlewaresWrap(handler));
}
