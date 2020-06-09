import * as df from "durable-functions";
import { handler } from "./handler";

const SetBonusesAsRedeemedOrchestrator = df.orchestrator(handler);

export default SetBonusesAsRedeemedOrchestrator;
