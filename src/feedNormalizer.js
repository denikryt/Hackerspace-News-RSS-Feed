export function normalizeFeed({ sourceRow, validation, parsedFeed }) {
  const items = Array.isArray(parsedFeed.items)
    ? parsedFeed.items.map(normalizeItem).filter(Boolean)
    : [];

  return {
    id: createFeedId(sourceRow, validation),
    rowNumber: sourceRow.rowNumber,
    sourceListUrl: sourceRow.candidateFeedUrl,
    sourceWikiUrl: sourceRow.hackerspaceWikiUrl,
    finalFeedUrl: validation.finalUrl || sourceRow.candidateFeedUrl,
    siteUrl: parsedFeed.link || undefined,
    spaceName: sourceRow.hackerspaceName || parsedFeed.title || null,
    country: sourceRow.country || undefined,
    feedTitle: parsedFeed.title || undefined,
    feedDescription: parsedFeed.description || undefined,
    feedType: validation.detectedFormat || undefined,
    language: parsedFeed.language || undefined,
    updatedAt: toIsoString(parsedFeed.lastBuildDate || parsedFeed.updated || parsedFeed.pubDate),
    status: items.length > 0 ? "parsed_ok" : "parsed_empty",
    warnings: [],
    items,
  };
}

function normalizeItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const normalized = {
    id: item.guid || item.id || item.link || item.title,
    title: item.title || undefined,
    link: item.link || undefined,
    publishedAt: toIsoString(item.isoDate || item.pubDate || item.published),
    updatedAt: toIsoString(item.updated),
    author: item.creator || item.author || undefined,
    summary: item.contentSnippet || item.summary || item.description || undefined,
    summaryHtml: getHtmlCandidate(item.summary || item.description),
    summaryText: item.contentSnippet || stripHtml(item.summary || item.description || ""),
    contentHtml: getHtmlCandidate(item["content:encoded"] || item.content),
    contentText: item.contentSnippet || stripHtml(item["content:encoded"] || item.content || item.summary || item.description || ""),
    categories: normalizeCategories(item.categories),
    attachments: normalizeAttachments(item),
    guid: item.guid || undefined,
  };

  return removeUndefined(normalized);
}

function normalizeCategories(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return undefined;
  }
  return categories.map(String);
}

function normalizeAttachments(item) {
  const candidates = [
    item.enclosure,
    ...(Array.isArray(item.enclosures) ? item.enclosures : []),
    item["media:content"],
    item["media:thumbnail"],
  ].filter(Boolean);

  if (candidates.length === 0) {
    return undefined;
  }

  const attachments = candidates
    .flatMap((candidate) => (Array.isArray(candidate) ? candidate : [candidate]))
    .map((candidate) => {
      if (typeof candidate === "string") {
        return { url: candidate };
      }

      if (!candidate || typeof candidate !== "object") {
        return null;
      }

      return removeUndefined({
        url: candidate.url || candidate.$?.url || candidate.href,
        type: candidate.type || candidate.$?.type || candidate.medium,
        title: candidate.title || candidate.$?.title,
      });
    })
    .filter((attachment) => attachment?.url);

  return attachments.length > 0 ? attachments : undefined;
}

function getHtmlCandidate(value) {
  if (!value) {
    return undefined;
  }

  return /<[^>]+>/.test(String(value)) ? String(value) : undefined;
}

function createFeedId(sourceRow, validation) {
  return `row-${sourceRow.rowNumber}-${slugify(validation.finalUrl || sourceRow.candidateFeedUrl)}`;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function stripHtml(value) {
  if (!value) {
    return undefined;
  }
  const stripped = String(value).replace(/<[^>]*>/g, "").trim();
  return stripped || undefined;
}

function toIsoString(value) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function removeUndefined(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  );
}
