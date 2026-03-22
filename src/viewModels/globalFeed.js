import { ALL_CONTENT_STREAM_ID } from "../contentStreams.js";
import { buildContentStreamModel } from "./contentStreams.js";

export function buildGlobalFeedModel(
  normalizedPayload,
  options = {},
) {
  return buildContentStreamModel(normalizedPayload, {
    ...options,
    streamId: ALL_CONTENT_STREAM_ID,
  });
}
