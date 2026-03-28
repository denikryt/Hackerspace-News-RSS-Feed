import { readFile } from "node:fs/promises";

export function parseCuratedPublicationsYaml(text) {
  if (!text || !String(text).trim()) {
    return [];
  }

  const entries = [];
  let current = null;

  for (const rawLine of String(text).split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (trimmed.startsWith("- ")) {
      if (current) {
        entries.push(finalizeCuratedEntry(current));
      }

      current = {};
      const remainder = trimmed.slice(2).trim();
      if (remainder) {
        const [key, value] = parseKeyValue(remainder);
        current[key] = value;
      }
      continue;
    }

    if (!current) {
      throw new Error("Invalid curated yaml: expected list item");
    }

    const [key, value] = parseKeyValue(trimmed);
    current[key] = value;
  }

  if (current) {
    entries.push(finalizeCuratedEntry(current));
  }

  return entries;
}

export async function readCuratedPublications(filePath) {
  if (!filePath) {
    return [];
  }

  try {
    const text = await readFile(filePath, "utf8");
    return parseCuratedPublicationsYaml(text);
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

function parseKeyValue(line) {
  const match = /^([A-Za-z0-9_]+):\s*(.+)$/.exec(line);
  if (!match) {
    throw new Error(`Invalid curated yaml line: ${line}`);
  }

  return [match[1], stripWrappingQuotes(match[2].trim())];
}

function finalizeCuratedEntry(entry) {
  if (!entry.feedUrl) {
    throw new Error("Invalid curated entry: missing feedUrl");
  }

  if (!entry.guid) {
    throw new Error("Invalid curated entry: missing guid");
  }

  return {
    feedUrl: entry.feedUrl,
    guid: entry.guid,
  };
}

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function removeUndefined(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  );
}
