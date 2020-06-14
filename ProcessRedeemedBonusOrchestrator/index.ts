import * as df from "durable-functions";
import { handler } from "./handler";

const ProcessRedeemedBonusOrchestrator = df.orchestrator(handler);

export default ProcessRedeemedBonusOrchestrator;
