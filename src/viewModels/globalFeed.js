import { FEED_CONTENT_STREAM_ID } from "../feedSections.js";
import { buildFeedSectionModel } from "./feedSections.js";

export function buildGlobalFeedModel(
  normalizedPayload,
  options = {},
) {
  return buildFeedSectionModel(normalizedPayload, {
    ...options,
    sectionId: FEED_CONTENT_STREAM_ID,
  });
}
