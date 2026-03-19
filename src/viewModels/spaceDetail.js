import { slugify } from "../utils/slugify.js";
import { getEffectiveItemDate } from "../visibleData.js";

export function buildSpaceDetailModel(normalizedPayload, spaceSlug) {
  const feed = (normalizedPayload.feeds || []).find(
    (entry) => slugify(entry.spaceName) === spaceSlug,
  );

  if (!feed) {
    const failure = (normalizedPayload.failures || []).find(
      (entry) => slugify(entry.hackerspaceName) === spaceSlug,
    );

    if (!failure) {
      throw new Error(`Space not found for slug: ${spaceSlug}`);
    }

    return {
      spaceName: failure.hackerspaceName,
      country: failure.country,
      sourceWikiUrl: failure.sourceWikiUrl,
      feedUrl: failure.candidateUrl,
      siteUrl: undefined,
      feedType: undefined,
      status: "error",
      errorCode: failure.errorCode,
      errorMessage: failure.errorMessage,
      items: [],
      homeHref: "/index.html",
      globalFeedHref: "/feed/index.html",
    };
  }

  return {
    spaceName: feed.spaceName,
    country: feed.country,
    sourceWikiUrl: feed.sourceWikiUrl,
    feedUrl: feed.finalFeedUrl,
    siteUrl: feed.siteUrl,
    feedType: feed.feedType,
    status: feed.status,
    errorCode: undefined,
    errorMessage: undefined,
    items: [...(feed.items || [])].sort(compareItemsByDateDesc),
    homeHref: "/index.html",
    globalFeedHref: "/feed/index.html",
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
