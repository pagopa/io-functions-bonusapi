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

import { RedeemedBonuses } from "../generated/definitions/RedeemedBonuses";
import {
  RequestAccepted,
  StatusEnum
} from "../generated/definitions/RequestAccepted";
import { OrchestratorInput as ProcessRedeemedBonusesOrchestratorInput } from "../ProcessRedeemedBonusesOrchestrator/handler";

type ISetBonusesAsRedeemedHandler = (
  context: Context,
  redeemedBonuses: RedeemedBonuses
) => Promise<IResponseSuccessAccepted<RequestAccepted>>;

export function SetBonusesAsRedeemedHandler(): ISetBonusesAsRedeemedHandler {
  return async (context, redeemedBonuses) => {
    const client = df.getClient(context);

    await client.startNew(
      "ProcessRedeemedBonusesOrchestrator",
      undefined,
      ProcessRedeemedBonusesOrchestratorInput.encode(redeemedBonuses)
    );

    return ResponseSuccessAccepted(undefined, {
      status: StatusEnum.OK
    });
  };
}

export function SetBonusesAsRedeemed(): express.RequestHandler {
  const handler = SetBonusesAsRedeemedHandler();

  const middlewaresWrap = withRequestMiddlewares(
    // Extract Azure Functions bindings
    ContextMiddleware(),
    RequiredBodyPayloadMiddleware(RedeemedBonuses)
  );

  return wrapRequestHandler(middlewaresWrap(handler));
}
