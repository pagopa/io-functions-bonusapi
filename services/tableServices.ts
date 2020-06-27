import { TableService } from "azure-storage";

import { getRequiredStringEnv } from "io-functions-commons/dist/src/utils/env";

const storageConnectionString = getRequiredStringEnv(
  "STORAGE_BONUS_CONNECTION_STRING"
);

export const bonusStorageTableService = new TableService(
  storageConnectionString
);
