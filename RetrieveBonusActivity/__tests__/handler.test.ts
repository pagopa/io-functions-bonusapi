import { left, right } from "fp-ts/lib/Either";
import { none, Option, some } from "fp-ts/lib/Option";
import { fromEither } from "fp-ts/lib/TaskEither";

import { context as contextMock } from "../../__mocks__/durable-functions";
import { aRetrievedBonusActivation } from "../../__mocks__/models";
import { RetrievedBonusActivation } from "../../models/bonus_activation";
import { ActivityInput, getRetrieveBonusActivityHandler } from "../handler";

const activityInput: ActivityInput = {
  bonusID: "AAAAAAAAAAAA"
};

describe("getRetrieveBonusActivityHandler", () => {
  it("should return FAILURE when the input cant be decoded", async () => {
    const findBonusActivationTaskMock = jest.fn();

    const handler = getRetrieveBonusActivityHandler(
      findBonusActivationTaskMock
    );

    const input = {};

    const result = await handler(contextMock, input);

    expect(findBonusActivationTaskMock).not.toBeCalled();
    expect(result.kind === "FAILURE").toBeTruthy();
  });

  it("should return FAILURE if there is an error when retrieving the bonus", async () => {
    const findBonusActivationTaskMock = jest.fn(() =>
      fromEither<Error, Option<RetrievedBonusActivation>>(left(Error()))
    );

    const handler = getRetrieveBonusActivityHandler(
      findBonusActivationTaskMock
    );

    const result = await handler(contextMock, activityInput);

    expect(findBonusActivationTaskMock).toBeCalledWith(activityInput.bonusID);
    expect(result.kind === "FAILURE").toBeTruthy();
  });

  it("should return SUCCESS_BONUS_NOT_FOUND if the bonus cant be found in the db", async () => {
    const findBonusActivationTaskMock = jest.fn(() =>
      fromEither<Error, Option<RetrievedBonusActivation>>(right(none))
    );

    const handler = getRetrieveBonusActivityHandler(
      findBonusActivationTaskMock
    );

    const result = await handler(contextMock, activityInput);

    expect(findBonusActivationTaskMock).toBeCalledWith(activityInput.bonusID);
    expect(result.kind === "SUCCESS_BONUS_NOT_FOUND");
  });

  it("should return SUCCESS_BONUS_FOUND and the bonus if the bonus is found in the db", async () => {
    const findBonusActivationTaskMock = jest.fn(() =>
      fromEither<Error, Option<RetrievedBonusActivation>>(
        right(some(aRetrievedBonusActivation))
      )
    );

    const handler = getRetrieveBonusActivityHandler(
      findBonusActivationTaskMock
    );

    const result = await handler(contextMock, activityInput);

    expect(findBonusActivationTaskMock).toBeCalledWith(activityInput.bonusID);
    expect(result.kind === "SUCCESS_BONUS_FOUND").toBeTruthy();
    if (result.kind === "SUCCESS_BONUS_FOUND") {
      expect(result.bonus).toEqual(aRetrievedBonusActivation);
    }
  });
});
