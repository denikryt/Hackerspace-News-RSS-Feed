import { slugify } from "../utils/slugify.js";

export function buildSpacesIndexModel(normalizedPayload) {
  const failureCards = (normalizedPayload.failures || []).map((failure) => ({
    spaceName: failure.hackerspaceName,
    country: failure.country,
    sourceWikiUrl: failure.sourceWikiUrl,
    feedUrl: failure.candidateUrl,
    status: "error",
    latestItemTitle: undefined,
    latestItemDate: undefined,
    detailHref: `/spaces/${slugify(failure.hackerspaceName)}.html`,
    errorCode: failure.errorCode,
  }));

  const feedCards = (normalizedPayload.feeds || []).map((feed) => {
    const latestItem = [...(feed.items || [])]
      .filter((item) => item.publishedAt)
      .sort(compareItemsByDateDesc)[0] || feed.items?.[0];

    return {
      spaceName: feed.spaceName,
      country: feed.country,
      sourceWikiUrl: feed.sourceWikiUrl,
      feedUrl: feed.finalFeedUrl,
      siteUrl: feed.siteUrl,
      status: feed.status,
      latestItemTitle: latestItem?.title,
      latestItemDate: latestItem?.publishedAt,
      detailHref: `/spaces/${slugify(feed.spaceName)}.html`,
    };
  });

  const cards = [...failureCards, ...feedCards].sort((a, b) =>
    a.spaceName.localeCompare(b.spaceName),
  );

  return {
    generatedAt: normalizedPayload.generatedAt,
    sourcePageUrl: normalizedPayload.sourcePageUrl,
    summary: normalizedPayload.summary,
    cards,
  };
}

function compareItemsByDateDesc(a, b) {
  return Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0);
}
