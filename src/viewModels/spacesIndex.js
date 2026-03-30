import { slugify } from "../utils/slugify.js";
import { getEffectiveItemDate } from "../visibleData.js";

export function buildSpacesIndexModel(
  normalizedPayload,
  {
    sortMode = "alphabetical",
    showFailed = false,
    searchQuery = "",
    selectedCountry = "all",
  } = {},
) {
  const failureCards = (normalizedPayload.failures || []).map(buildFailureCard);
  const feedCards = (normalizedPayload.feeds || []).map(buildFeedCard);

  const cards = [...failureCards, ...feedCards].sort(createCardComparator(sortMode));
  const availableCountries = [...new Set(cards.map((card) => card.country).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
  const visibleCards = cards.filter((card) => showFailed || !card.isFailure);

  return {
    generatedAt: normalizedPayload.generatedAt,
    sourcePageUrl: normalizedPayload.sourcePageUrl,
    summary: normalizedPayload.summary,
    sortMode,
    showFailed,
    searchQuery,
    selectedCountry,
    availableCountries,
    cards,
    visibleCards,
  };
}

function buildFailureCard(failure) {
  return {
    spaceName: failure.hackerspaceName,
    country: failure.country,
    sourceWikiUrl: failure.sourceWikiUrl,
    feedUrl: failure.candidateUrl,
    status: "error",
    isFailure: true,
    isVisibleByDefault: false,
    latestItemTitle: undefined,
    latestItemDate: undefined,
    detailHref: `/spaces/${slugify(failure.hackerspaceName)}.html`,
    errorCode: failure.errorCode,
  };
}

function buildFeedCard(feed) {
  const latestItem = [...(feed.items || [])].sort(compareItemsByDateDesc)[0] || feed.items?.[0];

  return {
    spaceName: feed.spaceName,
    country: feed.country,
    sourceWikiUrl: feed.sourceWikiUrl,
    feedUrl: feed.finalFeedUrl,
    siteUrl: feed.siteUrl,
    status: feed.status,
    isFailure: false,
    isVisibleByDefault: true,
    publicationsCount: Array.isArray(feed.items) ? feed.items.length : 0,
    latestItemTitle: latestItem?.title,
    latestItemLink: latestItem?.link,
    latestItemDate: getEffectiveItemDate(latestItem),
    detailHref: `/spaces/${slugify(feed.spaceName)}.html`,
  };
}

function compareItemsByDateDesc(a, b) {
  const aDate = getComparableTimestamp(a);
  const bDate = getComparableTimestamp(b);
  return bDate - aDate;
}

function createCardComparator(sortMode) {
  if (sortMode === "latest-publication") {
    return (left, right) => {
      const leftDate = getComparableTimestamp(left);
      const rightDate = getComparableTimestamp(right);

      if (rightDate !== leftDate) {
        return rightDate - leftDate;
      }

      return left.spaceName.localeCompare(right.spaceName);
    };
  }

  return (left, right) => left.spaceName.localeCompare(right.spaceName);
}

function getComparableTimestamp(value) {
  const effectiveDate = getEffectiveItemDate(value);
  if (!effectiveDate) {
    return -Infinity;
  }

  const timestamp = Date.parse(effectiveDate);
  return Number.isNaN(timestamp) ? -Infinity : timestamp;
}
