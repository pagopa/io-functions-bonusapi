import { Context } from "@azure/functions";
import * as express from "express";

import { ContextMiddleware } from "io-functions-commons/dist/src/utils/middlewares/context_middleware";
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

/**
 * A request middleware that validates the Message payload.
 */
export const RedeemedBonusesMiddleware: IRequestMiddleware<
  "IResponseErrorValidation",
  RedeemedBonuses
> = request =>
  new Promise(resolve => {
    return resolve(
      RedeemedBonuses.decode(request.body).mapLeft(
        ResponseErrorFromValidationErrors(RedeemedBonuses)
      )
    );
  });

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
    RedeemedBonusesMiddleware
  );

  return wrapRequestHandler(middlewaresWrap(handler));
}
