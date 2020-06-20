import { context as contextMock } from "../../__mocks__/durable-functions";
import { aFiscalCode, aMessageContent } from "../../__mocks__/models";
import { makeNewMessage } from "../../utils/notifications";
import { ActivityInput, getSendMessageActivityHandler } from "../handler";

const aValidInput: ActivityInput = {
  checkProfile: true,
  content: aMessageContent,
  fiscalCode: aFiscalCode
};

describe("getReadBonusActivityHandler", () => {
  it("should return FAILURE when the input cant be decoded", async () => {
    const getProfile = jest.fn();
    const sendMessage = jest.fn();

    const handler = getSendMessageActivityHandler(getProfile, sendMessage);

    const input = {};

    const result = await handler(contextMock, input);

    expect(getProfile).not.toBeCalled();
    expect(sendMessage).not.toBeCalled();
    expect(result.kind === "FAILURE").toBeTruthy();
  });

  it("should call both getProfile and sendProfile if checkProfile = true in the input", async () => {
    const getProfile = jest.fn().mockResolvedValue(200);
    const sendMessage = jest.fn().mockResolvedValue(201);

    const handler = getSendMessageActivityHandler(getProfile, sendMessage);

    const result = await handler(contextMock, aValidInput);

    expect(getProfile).toBeCalledWith(aValidInput.fiscalCode);
    expect(sendMessage).toBeCalledWith(
      aValidInput.fiscalCode,
      makeNewMessage(aValidInput.content)
    );
    expect(result.kind === "SUCCESS").toBeTruthy();
  });

  it("should call only sendProfile if checkProfile = false in the input", async () => {
    const getProfile = jest.fn().mockResolvedValue(200);
    const sendMessage = jest.fn().mockResolvedValue(201);

    const handler = getSendMessageActivityHandler(getProfile, sendMessage);

    const result = await handler(contextMock, {
      ...aValidInput,
      checkProfile: false
    });

    expect(getProfile).not.toBeCalled();
    expect(sendMessage).toBeCalledWith(
      aValidInput.fiscalCode,
      makeNewMessage(aValidInput.content)
    );
    expect(result.kind === "SUCCESS").toBeTruthy();
  });

  it("should throw if getProfile throw", async () => {
    const getProfile = jest.fn(() => {
      throw new Error();
    });
    const sendMessage = jest.fn();

    await expect(
      getSendMessageActivityHandler(getProfile, sendMessage)(
        contextMock,
        aValidInput
      )
    ).rejects.toThrow();
  });

  it("should throw if getProfile returns temporary error", async () => {
    const getProfile = jest.fn().mockResolvedValue(500);
    const sendMessage = jest.fn();

    await expect(
      getSendMessageActivityHandler(getProfile, sendMessage)(
        contextMock,
        aValidInput
      )
    ).rejects.toThrow();
  });

  it("should return FAILURE if getProfile returns permanent error", async () => {
    const getProfile = jest.fn().mockResolvedValue(401);
    const sendMessage = jest.fn();

    const handler = getSendMessageActivityHandler(getProfile, sendMessage);

    const result = await handler(contextMock, aValidInput);

    expect(result.kind === "FAILURE").toBeTruthy();
  });

  it("should throw if sendMessage throw", async () => {
    const getProfile = jest.fn().mockResolvedValue(200);
    const sendMessage = jest.fn(() => {
      throw new Error();
    });
    await expect(
      getSendMessageActivityHandler(getProfile, sendMessage)(
        contextMock,
        aValidInput
      )
    ).rejects.toThrow();
  });

  it("should throw if sendMessage return a temporary error", async () => {
    const getProfile = jest.fn().mockResolvedValue(200);
    const sendMessage = jest.fn().mockResolvedValue(500);
    await expect(
      getSendMessageActivityHandler(getProfile, sendMessage)(
        contextMock,
        aValidInput
      )
    ).rejects.toThrow();
  });

  it("should return FAILURE if sendMessage returns permanent error", async () => {
    const getProfile = jest.fn().mockResolvedValue(200);
    const sendMessage = jest.fn().mockResolvedValue(401);

    const handler = getSendMessageActivityHandler(getProfile, sendMessage);

    const result = await handler(contextMock, aValidInput);

    expect(result.kind === "FAILURE").toBeTruthy();
  });

  it("should return SUCCESS on successfully getProfile and sendMessage", async () => {
    const getProfile = jest.fn().mockResolvedValue(200);
    const sendMessage = jest.fn().mockResolvedValue(201);

    const handler = getSendMessageActivityHandler(getProfile, sendMessage);

    const result = await handler(contextMock, aValidInput);

    expect(result.kind === "SUCCESS").toBeTruthy();
  });
});
