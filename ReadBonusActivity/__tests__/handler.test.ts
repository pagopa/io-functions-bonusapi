import { left, right } from "fp-ts/lib/Either";
import { none, Option, some } from "fp-ts/lib/Option";
import { fromEither } from "fp-ts/lib/TaskEither";

import { context as contextMock } from "../../__mocks__/durable-functions";
import { aBonusActivation } from "../../__mocks__/models";
import { BonusActivation } from "../../models/bonus_activation";
import { ActivityInput, getReadBonusActivityHandler } from "../handler";

const activityInput = ActivityInput.encode({
  bonusID: "AAAAAAAAAAAA"
});

describe("getReadBonusActivityHandler", () => {
  it("should return FAILURE when the input cant be decoded", async () => {
    const readBonusActivationTaskMock = jest.fn();

    const handler = getReadBonusActivityHandler(readBonusActivationTaskMock);

    const input = {};

    const result = await handler(contextMock, input);

    expect(readBonusActivationTaskMock).not.toBeCalled();
    expect(result.kind === "FAILURE").toBeTruthy();
  });

  it("should return FAILURE if there is an error when retrieving the bonus", async () => {
    const readBonusActivationTaskMock = jest.fn(() =>
      fromEither<Error, Option<BonusActivation>>(left(Error()))
    );

    const handler = getReadBonusActivityHandler(readBonusActivationTaskMock);

    const result = await handler(contextMock, activityInput);

    expect(readBonusActivationTaskMock).toBeCalledWith(activityInput.bonusID);
    expect(result.kind === "FAILURE").toBeTruthy();
  });

  it("should return SUCCESS_BONUS_NOT_FOUND if the bonus cant be found in the db", async () => {
    const readBonusActivationTaskMock = jest.fn(() =>
      fromEither<Error, Option<BonusActivation>>(right(none))
    );

    const handler = getReadBonusActivityHandler(readBonusActivationTaskMock);

    const result = await handler(contextMock, activityInput);

    expect(readBonusActivationTaskMock).toBeCalledWith(activityInput.bonusID);
    expect(result.kind === "SUCCESS_BONUS_NOT_FOUND");
  });

  it("should return SUCCESS_BONUS_FOUND and the bonus if the bonus is found in the db", async () => {
    const readBonusActivationTaskMock = jest.fn(() =>
      fromEither<Error, Option<BonusActivation>>(right(some(aBonusActivation)))
    );

    const handler = getReadBonusActivityHandler(readBonusActivationTaskMock);

    const result = await handler(contextMock, activityInput);

    expect(readBonusActivationTaskMock).toBeCalledWith(activityInput.bonusID);
    expect(result.kind === "SUCCESS_BONUS_FOUND").toBeTruthy();
    if (result.kind === "SUCCESS_BONUS_FOUND") {
      expect(result.bonus).toEqual(aBonusActivation);
    }
  });
});
