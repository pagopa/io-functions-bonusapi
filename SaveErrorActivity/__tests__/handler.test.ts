import { context as contextMock } from "../../__mocks__/durable-functions";
import { ActivityInput, getSaveErrorActivityHandler } from "../handler";

describe("getSaveErrorActivityHandler", () => {
  it("should return FAILURE if cant decode the input", async () => {
    const handler = getSaveErrorActivityHandler();

    const input = {};

    const result = await handler(contextMock, input);

    expect(result.kind === "FAILURE").toBeTruthy();
  });

  it("should fill the output binding and return SUCCESS", async () => {
    const handler = getSaveErrorActivityHandler();

    const input = ActivityInput.encode({
      bonusId: "AAAAAAAAAAAA",
      errorMessage: "Error on bonus retrieve",
      request: {
        bonus_code: "AAAAAAAAAAAA",
        redeemed_at: new Date()
      },
      requestId: "2011-10-05T14:48:00.000Z-d3b72dddefce4e758d92f4d411567177"
    });

    const contextMockWithBindings = {
      ...contextMock,
      bindings: {
        redeemedErrors: undefined
      }
    };

    const result = await handler(contextMockWithBindings, input);

    expect(contextMockWithBindings.bindings.redeemedErrors).toEqual({
      Message: input.errorMessage,
      PartitionKey: input.bonusId,
      Request: input.request,
      RowKey: input.requestId
    });
    expect(result.kind === "SUCCESS").toBeTruthy();
  });
});
