import { readFile } from "node:fs/promises";

// Curated selections use the same JSON items wrapper as the calendar registry.
// GUIDs remain exact strings: they identify publications within a feed.
export function parseCuratedPublications(text) {
  const payload = JSON.parse(text);
  if (!Array.isArray(payload?.items)) {
    throw new Error("Invalid curated registry: expected an items array");
  }
  return payload.items.map(finalizeCuratedEntry);
}

export async function readCuratedPublications(filePath) {
  if (!filePath) {
    return [];
  }

  try {
    const text = await readFile(filePath, "utf8");
    return parseCuratedPublications(text);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export function buildCuratedSourceRows(entries, existingSourceRows = []) {
  const existingUrls = new Set((existingSourceRows || []).map((row) => row.candidateFeedUrl));
  const uniqueFeedUrls = [...new Set((entries || []).map((entry) => entry.feedUrl))]
    .filter((feedUrl) => !existingUrls.has(feedUrl));

  return uniqueFeedUrls.map((feedUrl, index) => ({
    rowNumber: existingSourceRows.length + index + 1,
    hackerspaceName: undefined,
    country: undefined,
    hackerspaceWikiUrl: undefined,
    candidateFeedUrl: feedUrl,
  }));
}

export function resolveCuratedPublications(entries, feeds) {
  const items = [];
  const unresolved = [];
  const availableFeeds = Array.isArray(feeds) ? feeds : [];

  for (const entry of entries || []) {
    const matchedFeed = availableFeeds.find((feed) =>
      feed?.finalFeedUrl === entry.feedUrl || feed?.sourceListUrl === entry.feedUrl,
    );
    const matchedItem = matchedFeed?.items?.find((item) => item?.guid === entry.guid);

    if (!matchedFeed || !matchedItem) {
      unresolved.push({
        feedUrl: entry.feedUrl,
        guid: entry.guid,
      });
      continue;
    }

    items.push(
      removeUndefined({
        ...matchedItem,
        feedUrl: matchedFeed.finalFeedUrl || entry.feedUrl,
        sourceListUrl: matchedFeed.sourceListUrl,
        siteUrl: matchedFeed.siteUrl,
        feedTitle: matchedFeed.feedTitle,
        spaceName: matchedFeed.sourceWikiUrl ? matchedFeed.spaceName : undefined,
        sourceWikiUrl: matchedFeed.sourceWikiUrl,
      }),
    );
  }

  return { items, unresolved };
}

function finalizeCuratedEntry(entry) {
  if (typeof entry?.feedUrl !== "string" || !entry.feedUrl.trim()) {
    throw new Error("Invalid curated entry: missing feedUrl");
  }

  if (typeof entry?.guid !== "string" || !entry.guid.trim()) {
    throw new Error("Invalid curated entry: missing guid");
  }

  return {
    feedUrl: entry.feedUrl,
    guid: entry.guid,
  };
}

function removeUndefined(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  );
}
