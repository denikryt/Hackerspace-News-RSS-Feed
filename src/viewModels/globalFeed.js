import { slugify } from "../utils/slugify.js";

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
  const aDate = a.publishedAt ? Date.parse(a.publishedAt) : -Infinity;
  const bDate = b.publishedAt ? Date.parse(b.publishedAt) : -Infinity;
  return bDate - aDate;
}
