import * as df from "durable-functions";

import { trackEvent } from "../utils/appinsights";
import { getHandler } from "./handler";

const ProcessRedeemedBonusOrchestrator = df.orchestrator(
  getHandler(trackEvent)
);

export default ProcessRedeemedBonusOrchestrator;
