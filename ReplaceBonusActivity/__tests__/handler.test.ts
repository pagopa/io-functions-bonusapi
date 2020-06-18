import { left, right } from "fp-ts/lib/Either";
import { fromEither } from "fp-ts/lib/TaskEither";

import { context as contextMock } from "../../__mocks__/durable-functions";
import { aBonusActivation } from "../../__mocks__/models";
import {
  BonusActivation,
  BonusActivationStatusEnum
} from "../../models/bonus_activation";
import { ActivityInput, getReplaceBonusActivityHandler } from "../handler";

const activityInput = {
  id: "AAAAAAAAAAAA",
  redeemedAt: new Date(),
  status: BonusActivationStatusEnum.REDEEMED
};

const encodedActivityInput = ActivityInput.encode(activityInput);

describe("getReplaceBonusActivityHandler", () => {
  it("should return FAILURE when the input cant be decoded", async () => {
    const replaceBonusActivationTask = jest.fn();

    const handler = getReplaceBonusActivityHandler(replaceBonusActivationTask);

    const input = {};

    const result = await handler(contextMock, input);

    expect(replaceBonusActivationTask).not.toBeCalled();
    expect(result.kind === "FAILURE").toBeTruthy();
  });

  it("should return FAILURE if there is an error when replacing the bonus", async () => {
    const replaceBonusActivationTask = jest.fn(() =>
      fromEither<Error, BonusActivation>(left(Error()))
    );

    const handler = getReplaceBonusActivityHandler(replaceBonusActivationTask);

    const result = await handler(contextMock, encodedActivityInput);

    expect(replaceBonusActivationTask).toBeCalledWith(activityInput);
    expect(result.kind === "FAILURE").toBeTruthy();
  });

  it("should return SUCCESS after the bonus has been replaced", async () => {
    const replaceBonusActivationTask = jest.fn(() =>
      fromEither<Error, BonusActivation>(right(aBonusActivation))
    );

    const handler = getReplaceBonusActivityHandler(replaceBonusActivationTask);

    const result = await handler(contextMock, encodedActivityInput);

    expect(replaceBonusActivationTask).toBeCalledWith(activityInput);
    expect(result.kind === "SUCCESS").toBeTruthy();
  });
});
