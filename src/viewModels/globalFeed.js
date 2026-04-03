import { FEED_CONTENT_STREAM_ID } from "../feedSections.js";
import { buildFeedSectionModel } from "./feedSections.js";
import { listCountryFeedOptions } from "./countryFeeds.js";

export function buildGlobalFeedModel(
  normalizedPayload,
  options = {},
) {
  const { countryFeedContext, ...feedSectionOptions } = options;

  return {
    ...buildFeedSectionModel(normalizedPayload, {
      ...feedSectionOptions,
      sectionId: FEED_CONTENT_STREAM_ID,
    }),
    countryOptions: listCountryFeedOptions(normalizedPayload, FEED_CONTENT_STREAM_ID, null, {
      context: countryFeedContext,
    }),
  };
}
