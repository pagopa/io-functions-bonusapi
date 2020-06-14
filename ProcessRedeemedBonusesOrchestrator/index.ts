import * as df from "durable-functions";
import { handler } from "./handler";

const ProcessRedeemedBonusesOrchestrator = df.orchestrator(handler);

export default ProcessRedeemedBonusesOrchestrator;
