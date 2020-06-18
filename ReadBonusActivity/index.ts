import { Container } from "@azure/cosmos";

import { getRequiredStringEnv } from "io-functions-commons/dist/src/utils/env";

import {
  BONUS_ACTIVATION_COLLECTION_NAME,
  BonusActivation
} from "../models/bonus_activation";
import { cosmosClient, readContainerItemTask } from "../utils/cosmosdb";
import { getReadBonusActivityHandler } from "./handler";

const cosmosdbBonusDatabaseName = getRequiredStringEnv(
  "COSMOSDB_BONUS_DATABASE_NAME"
);

const bonusActivationContainer = cosmosClient
  .database(cosmosdbBonusDatabaseName)
  .container(BONUS_ACTIVATION_COLLECTION_NAME);

const readBonusActivationTask = (bac: Container) => (bonusID: string) => {
  return readContainerItemTask<BonusActivation>(bac, bonusID, bonusID);
};

export type ReadBonusActivationTaskT = typeof readBonusActivationTask;

const readBonusActivityHandler = getReadBonusActivityHandler(
  readBonusActivationTask(bonusActivationContainer)
);
export default readBonusActivityHandler;
