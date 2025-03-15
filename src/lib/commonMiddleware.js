import middy from "@middy/core";
import httpEventNormalizer from "@middy/http-event-normalizer";
import httpErrorHandler from "@middy/http-error-handler";
import cors from "@middy/http-cors";

export default (handler) =>
  middy(handler).use([httpEventNormalizer(), httpErrorHandler(), cors()]);
