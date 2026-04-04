import feedSectionsConfig from "../config/feed_sections.json" with { type: "json" };
import categoryDictionaryConfig from "../config/category_dictionary.json" with { type: "json" };
import {
  assertFeedSectionCategoryContract,
  getCategoryFeedSectionIds,
} from "./feedSectionCategoryContract.js";

export const FEED_CONTENT_STREAM_ID = "feed";
export const FALLBACK_CONTENT_STREAM_ID = "other";

/**
 * Feed section metadata is hand-maintained in config, while the runtime shape
 * stays derived here so callers do not duplicate ids, titles, or segments.
 */
const FEED_SECTION_CONFIG = feedSectionsConfig;
const SPECIAL_FEED_SECTION_IDS = [FEED_CONTENT_STREAM_ID, FALLBACK_CONTENT_STREAM_ID];

// Validate the hand-maintained config pair at import time so `render`/`build`
// fails immediately when taxonomy ids and feed-section routes drift apart.
assertFeedSectionCategoryContract({
  feedSectionsConfig: FEED_SECTION_CONFIG,
  categoryDictionary: categoryDictionaryConfig,
  specialSectionIds: SPECIAL_FEED_SECTION_IDS,
});

/**
 * Feed and fallback are special sections. Every other config key is a
 * category-backed public section that can be matched against normalized items.
 */
export const PUBLIC_FEED_SECTION_IDS = getCategoryFeedSectionIds(
  FEED_SECTION_CONFIG,
  SPECIAL_FEED_SECTION_IDS,
);

export function getFeedSectionDefinition(sectionId) {
  const entry = FEED_SECTION_CONFIG[sectionId];

  if (!entry) {
    throw new Error(`Unknown feed section: ${sectionId}`);
  }

  return {
    id: sectionId,
    segment: sectionId,
    label: entry.label,
    pageTitle: entry.label,
    pageIntro: entry.intro,
  };
}

export function getFeedSectionHref(sectionId, pageNumber = 1) {
  const { segment } = getFeedSectionDefinition(sectionId);
  return pageNumber <= 1 ? `/${segment}/index.html` : `/${segment}/page/${pageNumber}/`;
}

export function getFeedSectionOutputPath(sectionId, pageNumber = 1) {
  const { segment } = getFeedSectionDefinition(sectionId);
  return pageNumber <= 1 ? `${segment}/index.html` : `${segment}/page/${pageNumber}/index.html`;
}
