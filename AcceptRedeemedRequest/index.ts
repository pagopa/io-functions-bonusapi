import { AzureFunction, Context } from "@azure/functions";
import * as express from "express";

import { getRequiredStringEnv } from "io-functions-commons/dist/src/utils/env";
import { secureExpressApp } from "io-functions-commons/dist/src/utils/express";
import { setAppContext } from "io-functions-commons/dist/src/utils/middlewares/context_middleware";
import createAzureFunctionHandler from "io-functions-express/dist/src/createAzureFunctionsHandler";

import {
  bonusStorageBlobServiceClient,
  uploadTask
} from "../services/blobServices";
import { AcceptRedeemedRequest } from "./handler";

const redeemedRequestsContainerName = getRequiredStringEnv(
  "REDEEMED_REQUESTS_CONTAINER_NAME"
);

const uploadRedeemedRequestTask = (blobName: string, content: string) =>
  uploadTask(
    bonusStorageBlobServiceClient,
    redeemedRequestsContainerName,
    blobName,
    content
  );

export type UploadRedeemedRequestTaskT = typeof uploadRedeemedRequestTask;

// Setup Express
const app = express();
secureExpressApp(app);

// Add express route
app.post(
  "/api/bonus-vacanze/v1/redeemed",
  AcceptRedeemedRequest(uploadRedeemedRequestTask)
);

const azureFunctionHandler = createAzureFunctionHandler(app);

const httpStart: AzureFunction = (context: Context): void => {
  setAppContext(app, context);
  azureFunctionHandler(context);
};

export default httpStart;
