import {
  FEED_CONTENT_STREAM_ID,
  FALLBACK_CONTENT_STREAM_ID,
  PUBLIC_FEED_SECTION_IDS,
  getFeedSectionDefinition,
  getFeedSectionHref,
} from "../feedSections.js";
import { getAuthorsIndexHref } from "../authors.js";
import { GLOBAL_FEED_PAGE_SIZE, buildPageLinks, paginateItems } from "../pagination.js";
import { buildAuthorDirectory, withAuthorLinks } from "./authors.js";
import { slugify } from "../utils/slugify.js";
import { getEffectiveItemDate } from "../visibleData.js";

/**
 * Build the expensive shared inputs for feed-section view models once so the
 * render loop can reuse navigation and sorted items across many pages.
 */
export function buildFeedSectionContext(normalizedPayload) {
  const authorDirectory = buildAuthorDirectory(normalizedPayload);
  const allItems = collectAllFeedItems(normalizedPayload, authorDirectory);
  const availableSections = buildAvailableSections(allItems);

  return {
    authorDirectory,
    allItems,
    availableSections,
    availableSectionIds: availableSections.map((section) => section.id),
  };
}

export function listFeedSections(normalizedPayload, { context } = {}) {
  const feedSectionContext = context || buildFeedSectionContext(normalizedPayload);
  return feedSectionContext.availableSections;
}

/**
 * A feed section page always renders one selected slice of the shared feed
 * items plus the navigation between all currently available sections.
 */
export function buildFeedSectionModel(
  normalizedPayload,
  { sectionId = FEED_CONTENT_STREAM_ID, currentPage = 1, pageSize = GLOBAL_FEED_PAGE_SIZE, context } = {},
) {
  const feedSectionContext = context || buildFeedSectionContext(normalizedPayload);
  const availableSections = feedSectionContext.availableSections;
  const availableSectionIds = feedSectionContext.availableSectionIds;

  if (!availableSectionIds.includes(sectionId)) {
    throw new Error(`Feed section is not available: ${sectionId}`);
  }

  const definition = getFeedSectionDefinition(sectionId);
  const sectionItems = selectItemsForSection(feedSectionContext.allItems, sectionId);
  const pagination = paginateItems(sectionItems, currentPage, pageSize);
  const hrefForPage = (pageNumber) => getFeedSectionHref(sectionId, pageNumber);

  return {
    generatedAt: normalizedPayload.generatedAt,
    sourcePageUrl: normalizedPayload.sourcePageUrl,
    summary: normalizedPayload.summary,
    streamId: sectionId,
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
      ...availableSections.map((section) => ({
        href: section.href,
        label: section.label,
        isCurrent: section.id === sectionId,
      })),
      { href: getAuthorsIndexHref(), label: "Authors", isCurrent: false },
    ],
    homeHref: "/index.html",
    canonicalHref: hrefForPage(pagination.currentPage),
  };
}

function buildAvailableSections(allItems) {
  return getAvailableSectionIds(allItems).map((sectionId) => {
    const items = selectItemsForSection(allItems, sectionId);
    const definition = getFeedSectionDefinition(sectionId);

    return {
      id: sectionId,
      label: definition.label,
      href: getFeedSectionHref(sectionId, 1),
      totalItems: items.length,
    };
  });
}

/**
 * Feed-section selection works over one flattened publication list so every
 * category page and fallback page shares the same item ordering rules.
 */
function collectAllFeedItems(normalizedPayload, authorDirectory) {
  return (normalizedPayload.feeds || [])
    .flatMap((feed) =>
      (feed.items || []).map((item) =>
        withAuthorLinks(
          {
            ...item,
            spaceName: feed.spaceName,
            country: feed.country,
            spaceHref: `/spaces/${slugify(feed.spaceName)}.html`,
            sourceWikiUrl: feed.sourceWikiUrl,
          },
          authorDirectory,
        ),
      ),
    )
    .sort(compareItemsByDateDesc);
}

function getAvailableSectionIds(items) {
  const sectionIds = [FEED_CONTENT_STREAM_ID];

  for (const sectionId of PUBLIC_FEED_SECTION_IDS) {
    if (items.some((item) => itemHasPublicCategory(item, sectionId))) {
      sectionIds.push(sectionId);
    }
  }

  if (items.some((item) => belongsToFallbackSection(item))) {
    sectionIds.push(FALLBACK_CONTENT_STREAM_ID);
  }

  return sectionIds;
}

function selectItemsForSection(items, sectionId) {
  if (sectionId === FEED_CONTENT_STREAM_ID) {
    return items;
  }

  if (sectionId === FALLBACK_CONTENT_STREAM_ID) {
    return items.filter((item) => belongsToFallbackSection(item));
  }

  return items.filter((item) => itemHasPublicCategory(item, sectionId));
}

/**
 * The fallback section is reserved for items that did not land in any public
 * category-backed section after normalization.
 */
function belongsToFallbackSection(item) {
  return !PUBLIC_FEED_SECTION_IDS.some((sectionId) => itemHasPublicCategory(item, sectionId));
}

function itemHasPublicCategory(item, sectionId) {
  return Array.isArray(item.normalizedCategories) && item.normalizedCategories.includes(sectionId);
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
