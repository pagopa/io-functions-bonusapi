import * as df from "durable-functions";

import { getHandler } from "./handler";

const handler = getHandler();

const ProcessRedeemedRequestOrchestrator = df.orchestrator(handler);

export default ProcessRedeemedRequestOrchestrator;
