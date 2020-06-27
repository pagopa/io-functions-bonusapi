import { defaultTableStorageErrorLogger } from "../utils/loggers";
import { getSaveErrorActivityHandler } from "./handler";

const saveErrorActivityHandler = getSaveErrorActivityHandler(
  defaultTableStorageErrorLogger
);
export default saveErrorActivityHandler;
