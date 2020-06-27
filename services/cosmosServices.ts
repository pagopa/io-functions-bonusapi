/**
 * Use a singleton CosmosDB client across functions.
 */
import { toError } from "fp-ts/lib/Either";
import { fromNullable, Option } from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";

import { ConsistencyLevel, Container, CosmosClient } from "@azure/cosmos";

import { getRequiredStringEnv } from "io-functions-commons/dist/src/utils/env";

const cosmosDbUri = getRequiredStringEnv("COSMOSDB_BONUS_URI");
const masterKey = getRequiredStringEnv("COSMOSDB_BONUS_KEY");

export const cosmosBonusClient = new CosmosClient({
  consistencyLevel: ConsistencyLevel.Strong,
  endpoint: cosmosDbUri,
  key: masterKey
});

export const readContainerItemTask = <T>(
  container: Container,
  id: string,
  partitionKey: string
): TE.TaskEither<Error, Option<T>> => {
  return TE.tryCatch(
    () => container.item(id, partitionKey).read(),
    toError
  ).map(item => fromNullable(item.resource as T));
};

export const replaceContainerItemTask = <T>(
  container: Container,
  id: string,
  partitionKey: string,
  newItem: T
) => {
  return TE.tryCatch(
    () => container.item(id, partitionKey).replace(newItem),
    toError
  ).map(item => item.resource as T);
};
