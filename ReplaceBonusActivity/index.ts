import { Container } from "@azure/cosmos";

import { getRequiredStringEnv } from "io-functions-commons/dist/src/utils/env";

import {
  BONUS_ACTIVATION_COLLECTION_NAME,
  BonusActivation
} from "../models/bonus_activation";
import {
  cosmosBonusClient,
  replaceContainerItemTask
} from "../services/cosmosServices";
import { getContextErrorLogger } from "../utils/loggers";
import { getReplaceBonusActivityHandler } from "./handler";

const cosmosdbBonusDatabaseName = getRequiredStringEnv(
  "COSMOSDB_BONUS_DATABASE_NAME"
);

const bonusActivationContainer = cosmosBonusClient
  .database(cosmosdbBonusDatabaseName)
  .container(BONUS_ACTIVATION_COLLECTION_NAME);

const replaceBonusActivationTask = (bac: Container) => (
  bonusActivation: BonusActivation
) =>
  replaceContainerItemTask<BonusActivation>(
    bac,
    bonusActivation.id,
    bonusActivation.id,
    bonusActivation
  );

export type RetrieveBonusActivationTaskT = typeof replaceBonusActivationTask;

const replaceBonusActivityHandler = getReplaceBonusActivityHandler(
  getContextErrorLogger,
  replaceBonusActivationTask(bonusActivationContainer)
);
export default replaceBonusActivityHandler;
