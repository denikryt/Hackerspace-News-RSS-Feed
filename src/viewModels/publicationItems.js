import { buildDisplayContent } from "../contentDisplay.js";
import { slugify } from "../utils/slugify.js";
import { getEffectiveItemDate } from "../visibleData.js";

export function collectAggregatedPublicationItems(normalizedPayload) {
  const regularItems = (normalizedPayload.feeds || []).flatMap((feed) =>
    (feed.items || []).map((item) =>
      removeUndefined({
        ...item,
        displayContent: buildDisplayContent(item),
        sourceFeedUrl: feed.finalFeedUrl || feed.sourceListUrl,
        spaceName: feed.spaceName,
        country: feed.country,
        spaceHref: feed.spaceName ? `/spaces/${slugify(feed.spaceName)}.html` : undefined,
        sourceWikiUrl: feed.sourceWikiUrl,
      }),
    ),
  );

  const curatedItems = (normalizedPayload.curated?.items || []).map((item) =>
    removeUndefined({
      ...item,
      displayContent: buildDisplayContent(item),
      sourceFeedUrl: item.feedUrl || item.sourceListUrl,
      spaceName: item.spaceName,
      country: item.country,
      spaceHref: item.spaceName && item.sourceWikiUrl ? `/spaces/${slugify(item.spaceName)}.html` : undefined,
      sourceWikiUrl: item.sourceWikiUrl,
    }),
  );

  const deduped = new Map();
  for (const item of [...regularItems, ...curatedItems]) {
    const key = buildPublicationIdentity(item);
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }

  return [...deduped.values()].sort(compareItemsByDateDesc);
}

function buildPublicationIdentity(item) {
  const feedKey = item.sourceFeedUrl || item.feedUrl || "";
  const itemKey = item.guid || item.link || item.id || item.title || "";
  return `${feedKey}::${itemKey}`;
}

function compareItemsByDateDesc(a, b) {
  return getComparableTimestamp(b) - getComparableTimestamp(a);
}

function getComparableTimestamp(item) {
  const effectiveDate = getEffectiveItemDate(item);
  if (!effectiveDate) {
    return -Infinity;
  }

  const timestamp = Date.parse(effectiveDate);
  return Number.isNaN(timestamp) ? -Infinity : timestamp;
}

function removeUndefined(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  );
}
