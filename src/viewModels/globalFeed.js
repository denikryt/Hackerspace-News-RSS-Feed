import { slugify } from "../utils/slugify.js";
import { getEffectiveItemDate } from "../visibleData.js";

export function buildGlobalFeedModel(normalizedPayload) {
  const items = (normalizedPayload.feeds || [])
    .flatMap((feed) =>
      (feed.items || []).map((item) => ({
        ...item,
        spaceName: feed.spaceName,
        country: feed.country,
        spaceHref: `/spaces/${slugify(feed.spaceName)}.html`,
        sourceWikiUrl: feed.sourceWikiUrl,
      })),
    )
    .sort(compareItemsByDateDesc);

  return {
    generatedAt: normalizedPayload.generatedAt,
    sourcePageUrl: normalizedPayload.sourcePageUrl,
    summary: normalizedPayload.summary,
    items,
    homeHref: "/index.html",
  };
}

function compareItemsByDateDesc(a, b) {
  const aDate = getComparableTimestamp(a);
  const bDate = getComparableTimestamp(b);
  return bDate - aDate;
}

function getComparableTimestamp(item) {
  const effectiveDate = getEffectiveItemDate(item);
  if (!effectiveDate) {
    return -Infinity;
  }

  const timestamp = Date.parse(effectiveDate);
  return Number.isNaN(timestamp) ? -Infinity : timestamp;
}
