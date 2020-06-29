import * as df from "durable-functions";

import { trackEvent, trackException } from "../utils/appinsights";
import { getHandler } from "./handler";

const handler = getHandler(trackException, trackEvent);

const ProcessRedeemedRequestOrchestrator = df.orchestrator(handler);

export default ProcessRedeemedRequestOrchestrator;
