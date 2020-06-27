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
  uploadRedeemedRequestTask: UploadRedeemedRequestTaskT
): IAcceptRedeemedRequestHandler {
  return async (context, redeemedRequest) => {
    // Create identification values for the request
    const requestId = v4();
    const requestDate = format(new Date(), "yyyy-MM-dd");
    const blobPath = `${requestDate}/${requestId}.json`;

    // Save the request as blob
    const errorOrResponse = await uploadRedeemedRequestTask(
      blobPath,
      JSON.stringify(redeemedRequest)
    ).run();

    if (isLeft(errorOrResponse)) {
      return ResponseErrorInternal("Error saving request");
    }

    // Create a new orchestrator to handle the request
    // We pass the blob info so it can be loaded
    const client = df.getClient(context);
    await client.startNew(
      "ProcessRedeemedRequestOrchestrator",
      undefined,
      ProcessRedeemedRequestOrchestratorInput.encode({
        directory: requestDate,
        name: `${requestId}.json`
      })
    );

    return ResponseSuccessAccepted(undefined, {
      status: StatusEnum.OK
    });
  };
}

export function AcceptRedeemedRequest(
  uploadRedeemedRequestTask: UploadRedeemedRequestTaskT
): express.RequestHandler {
  const handler = AcceptRedeemedRequestHandler(uploadRedeemedRequestTask);

  const middlewaresWrap = withRequestMiddlewares(
    // Extract Azure Functions bindings
    ContextMiddleware(),
    RequiredBodyPayloadMiddleware(RedeemedRequest)
  );

  return wrapRequestHandler(middlewaresWrap(handler));
}
