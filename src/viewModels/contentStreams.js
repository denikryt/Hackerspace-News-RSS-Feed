import {
  FEED_CONTENT_STREAM_ID,
  FALLBACK_CONTENT_STREAM_ID,
  PUBLIC_CATEGORY_STREAM_IDS,
  getContentStreamDefinition,
  getContentStreamHref,
} from "../contentStreams.js";
import { getAuthorsIndexHref } from "../authors.js";
import { GLOBAL_FEED_PAGE_SIZE, buildPageLinks, paginateItems } from "../pagination.js";
import { buildAuthorDirectory, withAuthorLinks } from "./authors.js";
import { collectAggregatedPublicationItems } from "./publicationItems.js";
import { getEffectiveItemDate } from "../visibleData.js";

/**
 * Build the expensive shared inputs for content-stream view models once.
 * Render loops can then reuse the same author directory, flattened items, and
 * stream navigation metadata across many pages instead of recomputing them.
 */
export function buildContentStreamContext(normalizedPayload) {
  const authorDirectory = buildAuthorDirectory(normalizedPayload);
  const allItems = collectAllFeedItems(normalizedPayload, authorDirectory);
  const availableStreams = buildAvailableStreams(allItems);

  return {
    authorDirectory,
    allItems,
    availableStreams,
    availableStreamIds: availableStreams.map((stream) => stream.id),
  };
}

export function listContentStreams(normalizedPayload, { context } = {}) {
  const contentStreamContext = context || buildContentStreamContext(normalizedPayload);

  return contentStreamContext.availableStreams;
}

export function buildContentStreamModel(
  normalizedPayload,
  { streamId = FEED_CONTENT_STREAM_ID, currentPage = 1, pageSize = GLOBAL_FEED_PAGE_SIZE, context } = {},
) {
  const contentStreamContext = context || buildContentStreamContext(normalizedPayload);
  const availableStreams = contentStreamContext.availableStreams;
  const availableStreamIds = contentStreamContext.availableStreamIds;

  if (!availableStreamIds.includes(streamId)) {
    throw new Error(`Content stream is not available: ${streamId}`);
  }

  const definition = getContentStreamDefinition(streamId);
  const streamItems = selectItemsForStream(contentStreamContext.allItems, streamId);
  const pagination = paginateItems(streamItems, currentPage, pageSize);
  const hrefForPage = (pageNumber) => getContentStreamHref(streamId, pageNumber);

  return {
    generatedAt: normalizedPayload.generatedAt,
    sourcePageUrl: normalizedPayload.sourcePageUrl,
    summary: normalizedPayload.summary,
    streamId,
    pageTitle: definition.pageTitle,
    pageIntro: definition.pageIntro,
    items: pagination.items,
    totalItems: pagination.totalItems,
    pageSize: pagination.pageSize,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    currentPageLabel: `Page ${pagination.currentPage} of ${pagination.totalPages}`,
    publicationCountLabel: `${pagination.items.length} of ${pagination.totalItems} publications`,
    hasPreviousPage: pagination.currentPage > 1,
    hasNextPage: pagination.currentPage < pagination.totalPages,
    previousPageHref:
      pagination.currentPage > 1 ? hrefForPage(pagination.currentPage - 1) : undefined,
    nextPageHref:
      pagination.currentPage < pagination.totalPages
        ? hrefForPage(pagination.currentPage + 1)
        : undefined,
    pageLinks: buildPageLinks(pagination.currentPage, pagination.totalPages, hrefForPage),
    streamNavItems: [
      ...availableStreams.map((stream) => ({
        href: stream.href,
        label: stream.label,
        isCurrent: stream.id === streamId,
      })),
      { href: "/curated/index.html", label: "Curated", isCurrent: false },
      { href: getAuthorsIndexHref(), label: "Authors", isCurrent: false },
    ],
    homeHref: "/index.html",
    canonicalHref: hrefForPage(pagination.currentPage),
  };
}

function buildAvailableStreams(allItems) {
  return getAvailableStreamIds(allItems).map((streamId) => {
    const items = selectItemsForStream(allItems, streamId);
    const definition = getContentStreamDefinition(streamId);

    return {
      id: streamId,
      label: definition.label,
      href: getContentStreamHref(streamId, 1),
      totalItems: items.length,
    };
  });
}

function collectAllFeedItems(normalizedPayload, authorDirectory) {
  return collectAggregatedPublicationItems(normalizedPayload)
    .map((item) =>
      withAuthorLinks(item, authorDirectory),
    )
    .sort(compareItemsByDateDesc);
}

function getAvailableStreamIds(items) {
  const streamIds = [FEED_CONTENT_STREAM_ID];

  for (const streamId of PUBLIC_CATEGORY_STREAM_IDS) {
    if (items.some((item) => itemHasPublicCategory(item, streamId))) {
      streamIds.push(streamId);
    }
  }

  if (items.some((item) => belongsToFallbackStream(item))) {
    streamIds.push(FALLBACK_CONTENT_STREAM_ID);
  }

  return streamIds;
}

function selectItemsForStream(items, streamId) {
  if (streamId === FEED_CONTENT_STREAM_ID) {
    return items;
  }

  if (streamId === FALLBACK_CONTENT_STREAM_ID) {
    return items.filter((item) => belongsToFallbackStream(item));
  }

  return items.filter((item) => itemHasPublicCategory(item, streamId));
}

function belongsToFallbackStream(item) {
  return !PUBLIC_CATEGORY_STREAM_IDS.some((streamId) => itemHasPublicCategory(item, streamId));
}

function itemHasPublicCategory(item, streamId) {
  return Array.isArray(item.normalizedCategories) && item.normalizedCategories.includes(streamId);
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
