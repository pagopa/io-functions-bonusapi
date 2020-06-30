import { trackEvent, trackException } from "../utils/appinsights";
import { getHandler } from "./handler";

const handler = getHandler(trackException, trackEvent);

export default handler;
