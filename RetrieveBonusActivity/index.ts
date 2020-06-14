import { left, right, toError } from "fp-ts/lib/Either";
import { Option } from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";

import * as documentDbUtils from "io-functions-commons/dist/src/utils/documentdb";
import { getRequiredStringEnv } from "io-functions-commons/dist/src/utils/env";

import { BonusActivation } from "../generated/models/BonusActivation";
import {
  BONUS_ACTIVATION_COLLECTION_NAME,
  BonusActivationModel
} from "../models/bonus_activation";
import { documentClient } from "../utils/cosmosdb";
import { getRetrieveBonusActivityHandler } from "./handler";

const cosmosdbBonusDatabaseName = getRequiredStringEnv(
  "COSMOSDB_BONUS_DATABASE_NAME"
);
const cosmosdbBonusDatabaseUrl = documentDbUtils.getDatabaseUri(
  cosmosdbBonusDatabaseName
);

const bonusActivationsCollectionUri = documentDbUtils.getCollectionUri(
  cosmosdbBonusDatabaseUrl,
  BONUS_ACTIVATION_COLLECTION_NAME
);

const bonusActivationModel = new BonusActivationModel(
  documentClient,
  bonusActivationsCollectionUri
);

const findBonusActivationTask = (bam: BonusActivationModel) => (
  bonusID: string
): TE.TaskEither<Error, Option<BonusActivation>> =>
  TE.tryCatch(() => bam.find(bonusID, bonusID), toError).foldTaskEither(
    err => TE.fromEither(left(err)),
    queryErrorOrMaybeBonusActivation =>
      queryErrorOrMaybeBonusActivation.fold(
        queryError => TE.fromEither(left(new Error(queryError.body))),
        maybeBonusActivation => TE.fromEither(right(maybeBonusActivation))
      )
  );

export type FindBonusActivationTaskT = typeof findBonusActivationTask;

const retrieveBonusActivityHandler = getRetrieveBonusActivityHandler(
  findBonusActivationTask(bonusActivationModel)
);
export default retrieveBonusActivityHandler;
