import { right } from "fp-ts/lib/Either";
import { fromEither, fromLeft } from "fp-ts/lib/TaskEither";

import { BlockBlobUploadResponse } from "@azure/storage-blob";

import {
  context as contextMock,
  mockStartNew
} from "../../__mocks__/durable-functions";
import { aRedeemedRequest } from "../../__mocks__/models";
import { AcceptRedeemedRequestHandler } from "../handler";

describe("AcceptRedeemedRequestHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should try to upload the request as blob and return ResponseErrorInternal if it cant be saved", async () => {
    const uploadRedeemedRequestTaskMock = jest.fn(() =>
      fromLeft<Error, BlockBlobUploadResponse>(Error())
    );
    const trackException = jest.fn();
    const trackEvent = jest.fn();

    const result = await AcceptRedeemedRequestHandler(
      uploadRedeemedRequestTaskMock,
      trackException,
      trackEvent
    )(contextMock, aRedeemedRequest);

    expect(result.kind === "IResponseErrorInternal").toBeTruthy();
  });

  it("should try to upload the request as blob, start the ProcessRedeemedRequestOrchestrator and return ResponseSuccessAccepted after it has been saved", async () => {
    const uploadRedeemedRequestTaskMock = jest.fn(() =>
      fromEither<Error, BlockBlobUploadResponse>(
        right({} as BlockBlobUploadResponse)
      )
    );
    const trackException = jest.fn();
    const trackEvent = jest.fn();

    const result = await AcceptRedeemedRequestHandler(
      uploadRedeemedRequestTaskMock,
      trackException,
      trackEvent
    )(contextMock, aRedeemedRequest);

    expect(mockStartNew).toHaveBeenCalledWith(
      "ProcessRedeemedRequestOrchestrator",
      undefined,
      // TODO: Add the exact input
      expect.any(Object)
    );

    expect(result.kind === "IResponseSuccessAccepted").toBeTruthy();
  });
});
