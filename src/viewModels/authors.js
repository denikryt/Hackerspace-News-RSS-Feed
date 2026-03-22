import {
  createAuthorSlugBase,
  getAuthorDetailHref,
  getAuthorsIndexHref,
  isExcludedAuthorName,
} from "../authors.js";
import { buildPageLinks, GLOBAL_FEED_PAGE_SIZE, paginateItems } from "../pagination.js";
import { slugify } from "../utils/slugify.js";
import { getEffectiveItemDate } from "../visibleData.js";

export function buildAuthorsIndexModel(normalizedPayload, { excludedAuthorNames } = {}) {
  const authors = collectAuthors(normalizedPayload, { excludedAuthorNames });

  return {
    pageTitle: "Authors",
    authors,
    homeHref: "/index.html",
    allContentHref: "/all/index.html",
    authorsIndexHref: getAuthorsIndexHref(),
  };
}

export function buildAuthorDetailModel(
  normalizedPayload,
  authorSlug,
  {
    currentPage = 1,
    pageSize = GLOBAL_FEED_PAGE_SIZE,
    excludedAuthorNames,
  } = {},
) {
  const authors = collectAuthors(normalizedPayload, { excludedAuthorNames });
  const author = authors.find((entry) => entry.slug === authorSlug);

  if (!author) {
    throw new Error(`Author not found for slug: ${authorSlug}`);
  }

  const pagination = paginateItems(author.items, currentPage, pageSize);
  const hrefForPage = (pageNumber) => getAuthorDetailHref(author.slug, pageNumber);

  return {
    authorDisplayName: author.displayName,
    authorSlug: author.slug,
    authorSources: author.authorSources,
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
    allContentHref: "/all/index.html",
    authorsIndexHref: getAuthorsIndexHref(),
    canonicalHref: hrefForPage(pagination.currentPage),
  };
}

function collectAuthors(normalizedPayload, { excludedAuthorNames } = {}) {
  const groupedAuthors = new Map();

  for (const item of collectAllFeedItems(normalizedPayload)) {
    if (isExcludedAuthorName(item.resolvedAuthor, excludedAuthorNames)) {
      continue;
    }

    const key = item.resolvedAuthor;
    const existing = groupedAuthors.get(key) || {
      displayName: item.resolvedAuthor,
      items: [],
      authorSources: new Set(),
      latestItemDate: undefined,
    };

    existing.items.push(item);
    if (item.authorSource) {
      existing.authorSources.add(item.authorSource);
    }

    const itemDate = getEffectiveItemDate(item);
    if (!existing.latestItemDate || getComparableTimestamp(item) > getComparableTimestamp({ displayDate: existing.latestItemDate })) {
      existing.latestItemDate = itemDate;
    }

    groupedAuthors.set(key, existing);
  }

  const authors = [...groupedAuthors.values()]
    .map((author) => ({
      displayName: author.displayName,
      items: [...author.items].sort(compareItemsByDateDesc),
      authorSources: [...author.authorSources].sort(),
      latestItemDate: author.latestItemDate,
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));

  assignAuthorSlugs(authors);

  return authors.map((author) => ({
    displayName: author.displayName,
    slug: author.slug,
    itemCount: author.items.length,
    latestItemDate: author.latestItemDate,
    detailHref: getAuthorDetailHref(author.slug, 1),
    authorSources: author.authorSources,
    items: author.items,
  }));
}

function assignAuthorSlugs(authors) {
  const slugCounts = new Map();

  for (const author of authors) {
    const baseSlug = createAuthorSlugBase(author.displayName);
    const count = (slugCounts.get(baseSlug) || 0) + 1;
    slugCounts.set(baseSlug, count);
    author.slug = count === 1 ? baseSlug : `${baseSlug}-${count}`;
  }
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
