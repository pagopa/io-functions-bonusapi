import { toError } from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";

import { BlobServiceClient } from "@azure/storage-blob";

import { getRequiredStringEnv } from "io-functions-commons/dist/src/utils/env";

const storageBonusConnectionString = getRequiredStringEnv(
  "STORAGE_BONUS_CONNECTION_STRING"
);

export const bonusStorageBlobServiceClient = BlobServiceClient.fromConnectionString(
  storageBonusConnectionString
);

export const uploadTask = (
  blobServiceClient: BlobServiceClient,
  containerName: string,
  blobName: string,
  content: string
) =>
  TE.tryCatch(async () => {
    const blockBlobClient = blobServiceClient
      .getContainerClient(containerName)
      .getBlockBlobClient(blobName);
    return await blockBlobClient.upload(content, content.length);
  }, toError);
