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
      redeemedRequest: {
        items: [
          {
            bonus_code: "AAAAAAAAAAAA",
            redeemed_at: new Date()
          }
        ]
      },
      requestId: "2011-10-05T14:48:00.000Z-d3b72dddefce4e758d92f4d411567177"
    });

    const contextMockWithBindings = {
      ...contextMock,
      bindings: {
        outputBlob: undefined
      }
    };

    const result = await handler(contextMockWithBindings, input);

    expect(contextMockWithBindings.bindings.outputBlob).toEqual(input);
    expect(result.kind === "SUCCESS").toBeTruthy();
  });
});
