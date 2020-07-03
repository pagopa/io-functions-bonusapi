import { Container } from "@azure/cosmos";

import { getRequiredStringEnv } from "io-functions-commons/dist/src/utils/env";

import {
  BONUS_ACTIVATION_COLLECTION_NAME,
  BonusActivation
} from "../models/bonus_activation";
import {
  cosmosBonusClient,
  readContainerItemTask
} from "../services/cosmosServices";
import { getContextErrorLogger } from "../utils/loggers";
import { getReadBonusActivityHandler } from "./handler";

const cosmosdbBonusDatabaseName = getRequiredStringEnv(
  "COSMOSDB_BONUS_DATABASE_NAME"
);

const bonusActivationContainer = cosmosBonusClient
  .database(cosmosdbBonusDatabaseName)
  .container(BONUS_ACTIVATION_COLLECTION_NAME);

const readBonusActivationTask = (bac: Container) => (bonusID: string) => {
  return readContainerItemTask<BonusActivation>(bac, bonusID, bonusID);
};

export type ReadBonusActivationTaskT = typeof readBonusActivationTask;

const readBonusActivityHandler = getReadBonusActivityHandler(
  getContextErrorLogger,
  readBonusActivationTask(bonusActivationContainer)
);
export default readBonusActivityHandler;
