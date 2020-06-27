import * as df from "durable-functions";

import { trackEvent, trackException } from "../utils/appinsights";
import { getContextErrorLogger } from "../utils/loggers";
import { getHandler } from "./handler";

const handler = getHandler(getContextErrorLogger, trackException, trackEvent);

const processRedeemedBonusMessageOrchestrator = df.orchestrator(handler);

export default processRedeemedBonusMessageOrchestrator;
