import { Context } from "@azure/functions";
import * as express from "express";

import { ContextMiddleware } from "io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredBodyPayloadMiddleware } from "io-functions-commons/dist/src/utils/middlewares/required_body_payload";
import {
  IRequestMiddleware,
  withRequestMiddlewares,
  wrapRequestHandler
} from "io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseSuccessAccepted,
  ResponseErrorFromValidationErrors,
  ResponseSuccessAccepted
} from "italia-ts-commons/lib/responses";

import { RedeemedBonuses } from "../generated/definitions/RedeemedBonuses";
import {
  RequestAccepted,
  StatusEnum
} from "../generated/definitions/RequestAccepted";

type ISetBonusesAsRedeemedHandler = (
  context: Context,
  redeemedBonuses: RedeemedBonuses
) => Promise<IResponseSuccessAccepted<RequestAccepted>>;

export function SetBonusesAsRedeemedHandler(): ISetBonusesAsRedeemedHandler {
  return async (_, __) => {
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
