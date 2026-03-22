import {
  ALL_CONTENT_STREAM_ID,
  FALLBACK_CONTENT_STREAM_ID,
  PUBLIC_CATEGORY_STREAM_IDS,
  getContentStreamDefinition,
  getContentStreamHref,
} from "../contentStreams.js";
import { GLOBAL_FEED_PAGE_SIZE, buildPageLinks, paginateItems } from "../pagination.js";
import { slugify } from "../utils/slugify.js";
import { getEffectiveItemDate } from "../visibleData.js";

export function listContentStreams(normalizedPayload) {
  const allItems = collectAllFeedItems(normalizedPayload);

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

export function buildContentStreamModel(
  normalizedPayload,
  { streamId = ALL_CONTENT_STREAM_ID, currentPage = 1, pageSize = GLOBAL_FEED_PAGE_SIZE } = {},
) {
  const allItems = collectAllFeedItems(normalizedPayload);
  const availableStreams = listContentStreams(normalizedPayload);
  const availableStreamIds = availableStreams.map((stream) => stream.id);

  if (!availableStreamIds.includes(streamId)) {
    throw new Error(`Content stream is not available: ${streamId}`);
  }

  const definition = getContentStreamDefinition(streamId);
  const streamItems = selectItemsForStream(allItems, streamId);
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
    streamNavItems: availableStreams.map((stream) => ({
      href: stream.href,
      label: stream.label,
      isCurrent: stream.id === streamId,
    })),
    homeHref: "/index.html",
    canonicalHref: hrefForPage(pagination.currentPage),
  };
}

function collectAllFeedItems(normalizedPayload) {
  return (normalizedPayload.feeds || [])
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
}

function getAvailableStreamIds(items) {
  const streamIds = [ALL_CONTENT_STREAM_ID];

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
  if (streamId === ALL_CONTENT_STREAM_ID) {
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
