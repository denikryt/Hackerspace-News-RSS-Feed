import { getCountryFeedHref, getCountryFeedSlug } from "../countryFeeds.js";
import { FEED_CONTENT_STREAM_ID, getFeedSectionDefinition, getFeedSectionHref } from "../feedSections.js";
import { buildFeedSectionContext, buildFeedSectionModel, listFeedSections } from "./feedSections.js";
import { GLOBAL_FEED_PAGE_SIZE, buildPageLinks, paginateItems } from "../pagination.js";

export function buildCountryFeedContext(normalizedPayload, { feedSectionContext } = {}) {
  const sharedFeedSectionContext = feedSectionContext || buildFeedSectionContext(normalizedPayload);
  const countriesBySectionId = new Map();
  const itemsBySectionIdByCountry = new Map();

  for (const section of listFeedSections(normalizedPayload, { context: sharedFeedSectionContext })) {
    const itemsByCountry = new Map();

    for (const item of buildFeedSectionModel(normalizedPayload, {
      sectionId: section.id,
      pageSize: Number.MAX_SAFE_INTEGER,
      context: sharedFeedSectionContext,
    }).items) {
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

    const countries = [...itemsByCountry.keys()]
      .sort((left, right) => left.localeCompare(right))
      .map((country) => ({
        country,
        slug: getCountryFeedSlug(country),
        href: getCountryFeedHref(section.id, country),
      }));

    countriesBySectionId.set(section.id, countries);
    itemsBySectionIdByCountry.set(section.id, itemsByCountry);
  }

  return {
    feedSectionContext: sharedFeedSectionContext,
    countriesBySectionId,
    itemsBySectionIdByCountry,
    optionsBySelectedSlug: new Map(),
  };
}

export function listCountryFeeds(normalizedPayload, { context, sectionId = FEED_CONTENT_STREAM_ID } = {}) {
  const countryContext = context || buildCountryFeedContext(normalizedPayload);
  return countryContext.countriesBySectionId.get(sectionId) || [];
}

export function listCountryFeedOptions(
  normalizedPayload,
  sectionId = FEED_CONTENT_STREAM_ID,
  selectedCountrySlug = null,
  { context } = {},
) {
  const countryContext = context || buildCountryFeedContext(normalizedPayload);
  const cacheKey = `${sectionId}:${selectedCountrySlug || ""}`;

  if (countryContext.optionsBySelectedSlug.has(cacheKey)) {
    return countryContext.optionsBySelectedSlug.get(cacheKey);
  }

  const countries = listCountryFeeds(normalizedPayload, { context: countryContext, sectionId });
  if (countries.length === 0) {
    countryContext.optionsBySelectedSlug.set(cacheKey, []);
    return [];
  }

  const options = [
    {
      label: "All countries",
      href: getFeedSectionHref(sectionId, 1),
      isSelected: !selectedCountrySlug,
    },
    ...countries.map((entry) => ({
      label: entry.country,
      href: entry.href,
      isSelected: entry.slug === selectedCountrySlug,
    })),
  ];

  countryContext.optionsBySelectedSlug.set(cacheKey, options);
  return options;
}

export function buildCountryFeedModel(
  normalizedPayload,
  sectionId,
  countrySlug,
  { currentPage = 1, pageSize = GLOBAL_FEED_PAGE_SIZE, context } = {},
) {
  const countryContext = context || buildCountryFeedContext(normalizedPayload);
  const selectedCountry = listCountryFeeds(normalizedPayload, { context: countryContext, sectionId })
    .find((entry) => entry.slug === countrySlug);

  if (!selectedCountry) {
    throw new Error(`Country feed is not available: ${sectionId}/${countrySlug}`);
  }

  const definition = getFeedSectionDefinition(sectionId);
  const itemsByCountry = countryContext.itemsBySectionIdByCountry.get(sectionId) || new Map();
  const items = itemsByCountry.get(selectedCountry.country) || [];
  const pagination = paginateItems(items, currentPage, pageSize);
  const hrefForPage = (pageNumber) => getCountryFeedHref(sectionId, selectedCountry.country, pageNumber);

  return {
    generatedAt: normalizedPayload.generatedAt,
    sourcePageUrl: normalizedPayload.sourcePageUrl,
    summary: normalizedPayload.summary,
    streamId: sectionId,
    country: selectedCountry.country,
    countrySlug: selectedCountry.slug,
    pageTitle: `${definition.pageTitle} · ${selectedCountry.country}`,
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
    streamNavItems: buildFeedSectionModel(normalizedPayload, {
      sectionId,
      context: countryContext.feedSectionContext,
    }).streamNavItems,
    countryOptions: listCountryFeedOptions(normalizedPayload, sectionId, selectedCountry.slug, {
      context: countryContext,
    }),
    homeHref: "/index.html",
    canonicalHref: hrefForPage(pagination.currentPage),
  };
}
