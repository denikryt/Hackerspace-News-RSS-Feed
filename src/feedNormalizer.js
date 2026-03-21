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
    categoriesRaw: normalizeCategories(item.categories),
    authorCandidates: normalizeAuthorCandidates(item),
    dateCandidates: normalizeDateCandidates(item),
    summaryCandidates: normalizeSummaryCandidates(item),
    contentCandidates: normalizeContentCandidates(item),
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

function normalizeAuthorCandidates(item) {
  return normalizeValueCandidates(item, ["author", "creator"]);
}

function normalizeDateCandidates(item) {
  const candidates = [
    normalizeDateCandidate("isoDate", item.isoDate),
    normalizeDateCandidate("pubDate", item.pubDate),
    normalizeDateCandidate("published", item.published),
    normalizeDateCandidate("updated", item.updated),
  ].filter(Boolean);

  return candidates.length > 0 ? candidates : undefined;
}

function normalizeSummaryCandidates(item) {
  const candidates = [
    normalizeTextCandidate("contentSnippet", { text: item.contentSnippet }),
    normalizeTextCandidate("summary", {
      html: getHtmlCandidate(item.summary),
      text: item.summary ? stripHtml(item.summary) : undefined,
    }),
    normalizeTextCandidate("description", {
      html: getHtmlCandidate(item.description),
      text: item.description ? stripHtml(item.description) : undefined,
    }),
  ].filter(Boolean);

  return candidates.length > 0 ? candidates : undefined;
}

function normalizeContentCandidates(item) {
  const candidates = [
    normalizeTextCandidate("content:encoded", {
      html: getHtmlCandidate(item["content:encoded"]),
      text: item["content:encoded"] ? stripHtml(item["content:encoded"]) : undefined,
    }),
    normalizeTextCandidate("content", {
      html: getHtmlCandidate(item.content),
      text: item.content ? stripHtml(item.content) : undefined,
    }),
  ].filter(Boolean);

  return candidates.length > 0 ? candidates : undefined;
}

function normalizeValueCandidates(item, fieldNames) {
  const candidates = fieldNames
    .map((field) => {
      const value = item[field];
      if (!value) {
        return null;
      }

      return {
        field,
        value: String(value),
      };
    })
    .filter(Boolean);

  return candidates.length > 0 ? candidates : undefined;
}

function normalizeDateCandidate(field, value) {
  const normalizedValue = toIsoString(value);
  if (!normalizedValue) {
    return null;
  }

  return {
    field,
    value: normalizedValue,
  };
}

function normalizeTextCandidate(field, { html, text }) {
  if (!html && !text) {
    return null;
  }

  return removeUndefined({
    field,
    html,
    text,
  });
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
