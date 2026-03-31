import { FEED_CONTENT_STREAM_ID } from "../contentStreams.js";
import { buildContentStreamModel } from "./contentStreams.js";
import { listCountryFeedOptions } from "./countryFeeds.js";

export function buildGlobalFeedModel(
  normalizedPayload,
  options = {},
) {
  return {
    ...buildContentStreamModel(normalizedPayload, {
      ...options,
      streamId: FEED_CONTENT_STREAM_ID,
    }),
    countryOptions: listCountryFeedOptions(normalizedPayload),
  };
}
