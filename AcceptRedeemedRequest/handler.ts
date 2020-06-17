import { Context } from "@azure/functions";
import * as df from "durable-functions";
import * as express from "express";

import { ContextMiddleware } from "io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredBodyPayloadMiddleware } from "io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseSuccessAccepted,
  ResponseSuccessAccepted
} from "italia-ts-commons/lib/responses";

import { RedeemedRequest } from "../generated/definitions/RedeemedRequest";
import {
  RequestAccepted,
  StatusEnum
} from "../generated/definitions/RequestAccepted";
import { OrchestratorInput as ProcessRedeemedRequestOrchestratorInput } from "../ProcessRedeemedRequestOrchestrator/handler";

type IAcceptRedeemedRequestHandler = (
  context: Context,
  redeemedRequest: RedeemedRequest
) => Promise<IResponseSuccessAccepted<RequestAccepted>>;

export function AcceptRedeemedRequestHandler(): IAcceptRedeemedRequestHandler {
  return async (context, redeemedRequest) => {
    const client = df.getClient(context);

    await client.startNew(
      "ProcessRedeemedRequestOrchestrator",
      undefined,
      ProcessRedeemedRequestOrchestratorInput.encode(redeemedRequest)
    );

    return ResponseSuccessAccepted(undefined, {
      status: StatusEnum.OK
    });
  };
}

export function AcceptRedeemedRequest(): express.RequestHandler {
  const handler = AcceptRedeemedRequestHandler();

  const middlewaresWrap = withRequestMiddlewares(
    // Extract Azure Functions bindings
    ContextMiddleware(),
    RequiredBodyPayloadMiddleware(RedeemedRequest)
  );

  return wrapRequestHandler(middlewaresWrap(handler));
}
