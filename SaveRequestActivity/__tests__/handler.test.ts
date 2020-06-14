import { context as contextMock } from "../../__mocks__/durable-functions";
import { ActivityInput, getSaveRequestActivityHandler } from "../handler";

describe("getSaveRequestActivityHandler", () => {
  it("should return FAILURE if cant decode the input", async () => {
    const handler = getSaveRequestActivityHandler();

    const input = {};

    const result = await handler(contextMock, input);

    expect(result.kind === "FAILURE").toBeTruthy();
  });

  it("should fill the output binding and return SUCCESS", async () => {
    const handler = getSaveRequestActivityHandler();

    const input = ActivityInput.encode({
      items: [
        {
          bonus_code: "AAAAAAAAAAAA",
          redeemed_at: new Date()
        }
      ]
    });

    const contextMockWithBinding = {
      ...contextMock,
      bindings: {
        outputBlob: undefined
      }
    };

    const result = await handler(contextMockWithBinding, input);

    expect(contextMockWithBinding.bindings.outputBlob).toEqual(input);
    expect(result.kind === "SUCCESS").toBeTruthy();
  });
});
