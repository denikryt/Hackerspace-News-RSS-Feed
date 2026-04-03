import feedSectionsConfig from "../config/feed_sections.json" with { type: "json" };

export const FEED_CONTENT_STREAM_ID = "feed";
export const FALLBACK_CONTENT_STREAM_ID = "other";

/**
 * Feed section metadata is hand-maintained in config, while the runtime shape
 * stays derived here so callers do not duplicate ids, titles, or segments.
 */
const FEED_SECTION_CONFIG = feedSectionsConfig;

/**
 * Feed and fallback are special sections. Every other config key is a
 * category-backed public section that can be matched against normalized items.
 */
export const PUBLIC_FEED_SECTION_IDS = Object.keys(FEED_SECTION_CONFIG).filter(
  (sectionId) =>
    sectionId !== FEED_CONTENT_STREAM_ID && sectionId !== FALLBACK_CONTENT_STREAM_ID,
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
