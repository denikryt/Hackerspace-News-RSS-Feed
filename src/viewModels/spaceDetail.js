import { getAuthorsIndexHref } from "../authors.js";
import { getContentStreamHref } from "../contentStreams.js";
import { slugify } from "../utils/slugify.js";
import { getEffectiveItemDate } from "../visibleData.js";
import {
  buildPageLinks,
  getSpaceDetailHref,
  GLOBAL_FEED_PAGE_SIZE,
  paginateItems,
} from "../pagination.js";

export function buildSpaceDetailModel(
  normalizedPayload,
  spaceSlug,
  { currentPage = 1, pageSize = GLOBAL_FEED_PAGE_SIZE } = {},
) {
  const feed = (normalizedPayload.feeds || []).find(
    (entry) => slugify(entry.spaceName) === spaceSlug,
  );

  if (!feed) {
    const failure = (normalizedPayload.failures || []).find(
      (entry) => slugify(entry.hackerspaceName) === spaceSlug,
    );

    if (!failure) {
      throw new Error(`Space not found for slug: ${spaceSlug}`);
    }

    return {
      spaceName: failure.hackerspaceName,
      country: failure.country,
      sourceWikiUrl: failure.sourceWikiUrl,
      feedUrl: failure.candidateUrl,
      siteUrl: undefined,
      feedType: undefined,
      status: "error",
      errorCode: failure.errorCode,
      errorMessage: failure.errorMessage,
      items: [],
      currentPage: 1,
      totalPages: 1,
      currentPageLabel: "Page 1 of 1",
      publicationCountLabel: "0 of 0 publications",
      hasPreviousPage: false,
      hasNextPage: false,
      previousPageHref: undefined,
      nextPageHref: undefined,
      pageLinks: [],
      homeHref: "/index.html",
      allContentHref: getContentStreamHref("all", 1),
      authorsIndexHref: getAuthorsIndexHref(),
    };
  }

  const allItems = [...(feed.items || [])].sort(compareItemsByDateDesc);
  const pagination = paginateItems(allItems, currentPage, pageSize);
  const hrefForPage = (pageNumber) => getSpaceDetailHref(spaceSlug, pageNumber);

  return {
    spaceName: feed.spaceName,
    country: feed.country,
    sourceWikiUrl: feed.sourceWikiUrl,
    feedUrl: feed.finalFeedUrl,
    siteUrl: feed.siteUrl,
    feedType: feed.feedType,
    status: feed.status,
    errorCode: undefined,
    errorMessage: undefined,
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
    homeHref: "/index.html",
    allContentHref: getContentStreamHref("all", 1),
    authorsIndexHref: getAuthorsIndexHref(),
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
