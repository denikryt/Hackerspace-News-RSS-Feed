import { getAuthorsIndexHref } from "../authors.js";
import { getCountryFeedHref, getCountryFeedSlug } from "../countryFeeds.js";
import { buildContentStreamContext } from "./contentStreams.js";
import { GLOBAL_FEED_PAGE_SIZE, buildPageLinks, paginateItems } from "../pagination.js";

export function buildCountryFeedContext(normalizedPayload, { contentStreamContext } = {}) {
  const sharedContentContext = contentStreamContext || buildContentStreamContext(normalizedPayload);
  const itemsByCountry = new Map();

  for (const item of sharedContentContext.allItems || []) {
    if (!item.country) {
      continue;
    }

    const existingItems = itemsByCountry.get(item.country);
    if (existingItems) {
      existingItems.push(item);
      continue;
    }

    itemsByCountry.set(item.country, [item]);
  }

  const availableCountries = [...itemsByCountry.keys()]
    .sort((left, right) => left.localeCompare(right))
    .map((country) => ({
      country,
      slug: getCountryFeedSlug(country),
      href: getCountryFeedHref(country),
    }));

  return {
    contentStreamContext: sharedContentContext,
    countries: availableCountries,
    itemsByCountry,
    optionsBySelectedSlug: new Map(),
  };
}

export function listCountryFeeds(normalizedPayload, { context } = {}) {
  const countryContext = context || buildCountryFeedContext(normalizedPayload);
  return countryContext.countries;
}

export function listCountryFeedOptions(normalizedPayload, selectedCountrySlug = null, { context } = {}) {
  const countryContext = context || buildCountryFeedContext(normalizedPayload);
  if (countryContext.optionsBySelectedSlug.has(selectedCountrySlug || "")) {
    return countryContext.optionsBySelectedSlug.get(selectedCountrySlug || "");
  }

  const options = [
    {
      label: "All countries",
      href: "/feed/index.html",
      isSelected: !selectedCountrySlug,
    },
    ...countryContext.countries.map((entry) => ({
      label: entry.country,
      href: entry.href,
      isSelected: entry.slug === selectedCountrySlug,
    })),
  ];

  countryContext.optionsBySelectedSlug.set(selectedCountrySlug || "", options);
  return options;
}

export function buildCountryFeedModel(
  normalizedPayload,
  countrySlug,
  { currentPage = 1, pageSize = GLOBAL_FEED_PAGE_SIZE, context } = {},
) {
  const countryContext = context || buildCountryFeedContext(normalizedPayload);
  const selectedCountry = countryContext.countries.find((entry) => entry.slug === countrySlug);

  if (!selectedCountry) {
    throw new Error(`Country feed is not available: ${countrySlug}`);
  }

  const items = countryContext.itemsByCountry.get(selectedCountry.country) || [];
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
      ...countryContext.contentStreamContext.availableStreams.map((stream) => ({
        href: stream.href,
        label: stream.label,
        isCurrent: stream.id === "feed",
      })),
      { href: getAuthorsIndexHref(), label: "Authors", isCurrent: false },
    ],
    countryOptions: listCountryFeedOptions(normalizedPayload, selectedCountry.slug, {
      context: countryContext,
    }),
    homeHref: "/index.html",
    canonicalHref: hrefForPage(pagination.currentPage),
  };
}
