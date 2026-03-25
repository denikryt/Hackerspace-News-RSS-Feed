import { normalizeCategoriesWithDictionary } from "./categoryDictionary.js";

const AUTHOR_PRIORITY = ["author", "creator"];
const DISPLAY_DATE_PRIORITY = ["pubDate", "published", "isoDate", "updated"];
const CONTENT_PRIORITY = ["content:encoded", "content"];
const SUMMARY_PRIORITY = ["summary", "description", "contentSnippet"];

export function enrichFeed(feed) {
  return {
    ...feed,
    items: (feed.items || []).map(enrichFeedItem),
  };
}

export function enrichFeedItem(item) {
  const author = pickValueCandidate(item.authorCandidates, AUTHOR_PRIORITY);
  const published = pickValueCandidate(item.dateCandidates, DISPLAY_DATE_PRIORITY.slice(0, 3));
  const updated = pickValueCandidate(item.dateCandidates, ["updated"]);
  const displayDate = pickFirstDateCandidate(item.dateCandidates, DISPLAY_DATE_PRIORITY);
  const content = pickTextCandidate(item.contentCandidates, CONTENT_PRIORITY);
  const summary = pickTextCandidate(item.summaryCandidates, SUMMARY_PRIORITY);
  const categories = normalizeCategoriesWithDictionary(item.categoriesRaw);
  const primaryText = summary?.text ? { source: summary.field, text: summary.text } : content?.text
    ? { source: content.field, text: content.text }
    : null;

  return removeUndefined({
    id: item.id,
    title: item.title,
    link: item.link,
    guid: item.guid,
    attachments: item.attachments,
    resolvedAuthor: author?.value,
    authorSource: author?.field,
    publishedAt: published?.value,
    updatedAt: updated?.value,
    displayDate: displayDate?.value,
    dateSource: displayDate?.field,
    categoriesRaw: item.categoriesRaw,
    normalizedCategories: categories.normalizedCategories,
    unmappedCategories: categories.unmappedCategories,
    observed: buildObservedTrace(item),
    wordCount: countWords(primaryText?.text),
    hasFullContent: Boolean(content?.text || content?.html),
    hasSummary: Boolean(summary?.text || summary?.html),
    hasCategories: Boolean(item.categoriesRaw?.length),
    hasAuthor: Boolean(author?.value),
  });
}

function buildObservedTrace(item) {
  return removeUndefined({
    categoriesRaw: item.categoriesRaw,
    authorCandidates: item.authorCandidates,
    dateCandidates: item.dateCandidates,
    summaryCandidates: item.summaryCandidates,
    contentCandidates: item.contentCandidates,
  });
}

function pickValueCandidate(candidates, priority) {
  if (!Array.isArray(candidates)) {
    return undefined;
  }

  for (const field of priority) {
    const match = candidates.find((candidate) => candidate?.field === field && candidate.value);
    if (match) {
      return match;
    }
  }

  return undefined;
}

function pickFirstDateCandidate(candidates, priority) {
  return pickValueCandidate(candidates, priority);
}

function pickTextCandidate(candidates, priority) {
  if (!Array.isArray(candidates)) {
    return undefined;
  }

  for (const field of priority) {
    const match = candidates.find((candidate) =>
      candidate?.field === field && (candidate.text || candidate.html),
    );
    if (match) {
      return match;
    }
  }

  return undefined;
}

function countWords(value) {
  if (!value) {
    return 0;
  }

  return String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function removeUndefined(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  );
}
