import {
  createAuthorSlugBase,
  getAuthorDetailHref,
  getAuthorsIndexHref,
  getAuthorOverrides,
  isExcludedAuthorName,
  normalizeAuthorLookupKey,
  parseAuthorValue,
} from "../authors.js";
import { buildPageLinks, GLOBAL_FEED_PAGE_SIZE, paginateItems } from "../pagination.js";
import { slugify } from "../utils/slugify.js";
import { getEffectiveItemDate } from "../visibleData.js";

const DEFAULT_AUTHOR_SORT_MODE = "alphabetical";
const AUTHOR_SORT_MODES = new Set([
  "alphabetical",
  "publication-count",
  "latest-publication",
]);

export function buildAuthorsIndexModel(
  normalizedPayload,
  {
    selectedHackerspace = "all",
    sortMode = DEFAULT_AUTHOR_SORT_MODE,
    excludedAuthorNames,
    authorOverrides,
  } = {},
) {
  const { authors } = buildAuthorDirectory(normalizedPayload, { excludedAuthorNames, authorOverrides });
  const availableHackerspaces = collectAvailableHackerspaces(authors);
  const normalizedSelectedHackerspace = availableHackerspaces.includes(selectedHackerspace)
    ? selectedHackerspace
    : "all";
  const normalizedSortMode = AUTHOR_SORT_MODES.has(sortMode)
    ? sortMode
    : DEFAULT_AUTHOR_SORT_MODE;
  const sortedAuthors = [...authors].sort(createAuthorComparator(normalizedSortMode));
  const visibleAuthors = sortedAuthors.filter((author) =>
    normalizedSelectedHackerspace === "all"
      ? true
      : author.hackerspaces.some((hackerspace) => hackerspace.name === normalizedSelectedHackerspace),
  );

  return {
    pageTitle: "Authors",
    selectedHackerspace: normalizedSelectedHackerspace,
    sortMode: normalizedSortMode,
    availableHackerspaces,
    authors: sortedAuthors,
    visibleAuthors,
    homeHref: "/index.html",
    feedHref: "/feed/index.html",
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
    authorOverrides,
  } = {},
) {
  const { authors } = buildAuthorDirectory(normalizedPayload, { excludedAuthorNames, authorOverrides });
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
    feedHref: "/feed/index.html",
    authorsIndexHref: getAuthorsIndexHref(),
    canonicalHref: hrefForPage(pagination.currentPage),
  };
}

export function buildAuthorDirectory(
  normalizedPayload,
  { excludedAuthorNames, authorOverrides = getAuthorOverrides() } = {},
) {
  const groupedAuthors = new Map();

  for (const item of collectAllFeedItems(normalizedPayload)) {
    const authorParsing = parseAuthorValue(item.resolvedAuthor, { authorOverrides });
    if (!authorParsing.derivedAuthors.length) {
      continue;
    }

    for (const authorName of authorParsing.derivedAuthors) {
      if (isExcludedAuthorName(authorName, excludedAuthorNames)) {
        continue;
      }

      const key = normalizeAuthorLookupKey(authorName);
      const existing = groupedAuthors.get(key) || {
        displayName: authorName,
        items: [],
        authorSources: new Set(),
        hackerspaces: new Map(),
        latestItemDate: undefined,
      };

      existing.items.push(item);
      if (item.authorSource) {
        existing.authorSources.add(item.authorSource);
      }
      if (item.spaceName) {
        existing.hackerspaces.set(item.spaceName, {
          name: item.spaceName,
          href: item.spaceHref,
        });
      }

      const itemDate = getEffectiveItemDate(item);
      if (
        !existing.latestItemDate ||
        getComparableTimestamp(item) > getComparableTimestamp({ displayDate: existing.latestItemDate })
      ) {
        existing.latestItemDate = itemDate;
      }

      groupedAuthors.set(key, existing);
    }
  }

  const authors = [...groupedAuthors.values()]
    .map((author) => ({
      displayName: author.displayName,
      items: [...author.items].sort(compareItemsByDateDesc),
      authorSources: [...author.authorSources].sort(),
      hackerspaces: [...author.hackerspaces.values()].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
      latestItemDate: author.latestItemDate,
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));

  assignAuthorSlugs(authors);

  const slugByLookupKey = new Map(
    authors.map((author) => [normalizeAuthorLookupKey(author.displayName), author.slug]),
  );
  const publicAuthors = authors.map((author) => ({
    displayName: author.displayName,
    slug: author.slug,
    itemCount: author.items.length,
    latestItemDate: author.latestItemDate,
    detailHref: getAuthorDetailHref(author.slug, 1),
    authorSources: author.authorSources,
    hackerspaces: author.hackerspaces,
    items: author.items.map((item) =>
      withAuthorLinks(item, { excludedAuthorNames, authorOverrides, slugByLookupKey }),
    ),
  }));

  return {
    authors: publicAuthors,
    slugByLookupKey,
  };
}

export function withAuthorLinks(
  item,
  { excludedAuthorNames, authorOverrides = getAuthorOverrides(), slugByLookupKey } = {},
) {
  if (!slugByLookupKey) {
    return {
      ...item,
      authorLinks: [],
    };
  }

  const authorLinks = parseAuthorValue(item.resolvedAuthor, { authorOverrides }).derivedAuthors
    .filter((authorName) => !isExcludedAuthorName(authorName, excludedAuthorNames))
    .map((authorName) => {
      const slug = slugByLookupKey.get(normalizeAuthorLookupKey(authorName));
      if (!slug) {
        return undefined;
      }

      return {
        label: authorName,
        href: getAuthorDetailHref(slug, 1),
      };
    })
    .filter(Boolean);

  return {
    ...item,
    authorLinks,
  };
}

function collectAuthors(
  normalizedPayload,
  options = {},
) {
  return buildAuthorDirectory(normalizedPayload, options).authors.map((author) => ({
    ...author,
    items: author.items.map((item) => ({ ...item })),
  }));
}

function collectAvailableHackerspaces(authors) {
  return [...new Set(authors.flatMap((author) => author.hackerspaces.map((hackerspace) => hackerspace.name)))]
    .sort((left, right) => left.localeCompare(right));
}

function createAuthorComparator(sortMode) {
  if (sortMode === "publication-count") {
    return (left, right) => {
      if (right.itemCount !== left.itemCount) {
        return right.itemCount - left.itemCount;
      }

      return compareLatestPublicationThenName(left, right);
    };
  }

  if (sortMode === "latest-publication") {
    return (left, right) => {
      const dateDelta = getComparableTimestamp({ displayDate: right.latestItemDate })
        - getComparableTimestamp({ displayDate: left.latestItemDate });

      if (dateDelta !== 0) {
        return dateDelta;
      }

      if (right.itemCount !== left.itemCount) {
        return right.itemCount - left.itemCount;
      }

      return left.displayName.localeCompare(right.displayName);
    };
  }

  return (left, right) => left.displayName.localeCompare(right.displayName);
}

function compareLatestPublicationThenName(left, right) {
  const dateDelta = getComparableTimestamp({ displayDate: right.latestItemDate })
    - getComparableTimestamp({ displayDate: left.latestItemDate });

  if (dateDelta !== 0) {
    return dateDelta;
  }

  return left.displayName.localeCompare(right.displayName);
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
