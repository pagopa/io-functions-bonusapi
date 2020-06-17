import * as df from "durable-functions";
import { handler } from "./handler";

const ProcessRedeemedRequestOrchestrator = df.orchestrator(handler);

export default ProcessRedeemedRequestOrchestrator;
