import { slugify } from "../utils/slugify.js";
import { getEffectiveItemDate } from "../visibleData.js";
import {
  buildPageLinks,
  getGlobalFeedHref,
  GLOBAL_FEED_PAGE_SIZE,
  paginateItems,
} from "../pagination.js";

export function buildGlobalFeedModel(
  normalizedPayload,
  { currentPage = 1, pageSize = GLOBAL_FEED_PAGE_SIZE } = {},
) {
  const allItems = (normalizedPayload.feeds || [])
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

  const pagination = paginateItems(allItems, currentPage, pageSize);
  const pageLinks = buildPageLinks(
    pagination.currentPage,
    pagination.totalPages,
    getGlobalFeedHref,
  );

  return {
    generatedAt: normalizedPayload.generatedAt,
    sourcePageUrl: normalizedPayload.sourcePageUrl,
    summary: normalizedPayload.summary,
    items: pagination.items,
    totalItems: pagination.totalItems,
    pageSize: pagination.pageSize,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    currentPageLabel: `Page ${pagination.currentPage} of ${pagination.totalPages}`,
    hasPreviousPage: pagination.currentPage > 1,
    hasNextPage: pagination.currentPage < pagination.totalPages,
    previousPageHref:
      pagination.currentPage > 1 ? getGlobalFeedHref(pagination.currentPage - 1) : undefined,
    nextPageHref:
      pagination.currentPage < pagination.totalPages
        ? getGlobalFeedHref(pagination.currentPage + 1)
        : undefined,
    pageLinks,
    homeHref: "/index.html",
    canonicalHref: getGlobalFeedHref(pagination.currentPage),
  };
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
