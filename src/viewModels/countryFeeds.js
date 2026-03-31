import { getAuthorsIndexHref } from "../authors.js";
import { getCountryFeedHref, getCountryFeedSlug } from "../countryFeeds.js";
import { listContentStreams } from "./contentStreams.js";
import { GLOBAL_FEED_PAGE_SIZE, buildPageLinks, paginateItems } from "../pagination.js";
import { buildAuthorDirectory, withAuthorLinks } from "./authors.js";
import { slugify } from "../utils/slugify.js";
import { getEffectiveItemDate } from "../visibleData.js";

export function listCountryFeeds(normalizedPayload) {
  const countries = new Set();

  for (const feed of normalizedPayload.feeds || []) {
    if (!feed.country || !Array.isArray(feed.items) || feed.items.length === 0) {
      continue;
    }

    countries.add(feed.country);
  }

  return [...countries]
    .sort((left, right) => left.localeCompare(right))
    .map((country) => ({
      country,
      slug: getCountryFeedSlug(country),
      href: getCountryFeedHref(country),
    }));
}

export function listCountryFeedOptions(normalizedPayload, selectedCountrySlug = null) {
  const countries = listCountryFeeds(normalizedPayload);

  return [
    {
      label: "All countries",
      href: "/feed/index.html",
      isSelected: !selectedCountrySlug,
    },
    ...countries.map((entry) => ({
      label: entry.country,
      href: entry.href,
      isSelected: entry.slug === selectedCountrySlug,
    })),
  ];
}

export function buildCountryFeedModel(
  normalizedPayload,
  countrySlug,
  { currentPage = 1, pageSize = GLOBAL_FEED_PAGE_SIZE } = {},
) {
  const countries = listCountryFeeds(normalizedPayload);
  const selectedCountry = countries.find((entry) => entry.slug === countrySlug);

  if (!selectedCountry) {
    throw new Error(`Country feed is not available: ${countrySlug}`);
  }

  const authorDirectory = buildAuthorDirectory(normalizedPayload);
  const items = collectCountryItems(normalizedPayload, selectedCountry.country, authorDirectory);
  const pagination = paginateItems(items, currentPage, pageSize);
  const hrefForPage = (pageNumber) => getCountryFeedHref(selectedCountry.country, pageNumber);

  return {
    generatedAt: normalizedPayload.generatedAt,
    sourcePageUrl: normalizedPayload.sourcePageUrl,
    summary: normalizedPayload.summary,
    country: selectedCountry.country,
    countrySlug: selectedCountry.slug,
    pageTitle: `Feed · ${selectedCountry.country}`,
    pageIntro: `Publications from hackerspaces in ${selectedCountry.country}.`,
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
      ...listContentStreams(normalizedPayload).map((stream) => ({
        href: stream.href,
        label: stream.label,
        isCurrent: stream.id === "feed",
      })),
      { href: getAuthorsIndexHref(), label: "Authors", isCurrent: false },
    ],
    countryOptions: listCountryFeedOptions(normalizedPayload, selectedCountry.slug),
    homeHref: "/index.html",
    canonicalHref: hrefForPage(pagination.currentPage),
  };
}

function collectCountryItems(normalizedPayload, country, authorDirectory) {
  return (normalizedPayload.feeds || [])
    .filter((feed) => feed.country === country)
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
