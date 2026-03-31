import { getCountryFeedHref, getCountryFeedSlug } from "../countryFeeds.js";
import { FEED_CONTENT_STREAM_ID, getContentStreamDefinition, getContentStreamHref } from "../contentStreams.js";
import { buildContentStreamContext, buildStreamNavItems, selectItemsForStream } from "./contentStreams.js";
import { GLOBAL_FEED_PAGE_SIZE, buildPageLinks, paginateItems } from "../pagination.js";

export function buildCountryFeedContext(normalizedPayload, { contentStreamContext } = {}) {
  const sharedContentContext = contentStreamContext || buildContentStreamContext(normalizedPayload);
  const countriesByStreamId = new Map();
  const itemsByStreamIdByCountry = new Map();

  for (const streamId of sharedContentContext.availableStreamIds || [FEED_CONTENT_STREAM_ID]) {
    const itemsByCountry = new Map();

    for (const item of selectItemsForStream(sharedContentContext.allItems || [], streamId)) {
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
        href: getCountryFeedHref(streamId, country),
      }));

    countriesByStreamId.set(streamId, countries);
    itemsByStreamIdByCountry.set(streamId, itemsByCountry);
  }

  return {
    contentStreamContext: sharedContentContext,
    countriesByStreamId,
    itemsByStreamIdByCountry,
    optionsBySelectedSlug: new Map(),
  };
}

export function listCountryFeeds(normalizedPayload, { context, streamId = FEED_CONTENT_STREAM_ID } = {}) {
  const countryContext = context || buildCountryFeedContext(normalizedPayload);
  return countryContext.countriesByStreamId.get(streamId) || [];
}

export function listCountryFeedOptions(
  normalizedPayload,
  streamId = FEED_CONTENT_STREAM_ID,
  selectedCountrySlug = null,
  { context } = {},
) {
  const countryContext = context || buildCountryFeedContext(normalizedPayload);
  const cacheKey = `${streamId}:${selectedCountrySlug || ""}`;

  if (countryContext.optionsBySelectedSlug.has(cacheKey)) {
    return countryContext.optionsBySelectedSlug.get(cacheKey);
  }

  const countries = listCountryFeeds(normalizedPayload, { context: countryContext, streamId });
  if (countries.length === 0) {
    countryContext.optionsBySelectedSlug.set(cacheKey, []);
    return [];
  }

  const options = [
    {
      label: "All countries",
      href: getContentStreamHref(streamId, 1),
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
  streamId,
  countrySlug,
  { currentPage = 1, pageSize = GLOBAL_FEED_PAGE_SIZE, context } = {},
) {
  const countryContext = context || buildCountryFeedContext(normalizedPayload);
  const selectedCountry = listCountryFeeds(normalizedPayload, { context: countryContext, streamId })
    .find((entry) => entry.slug === countrySlug);

  if (!selectedCountry) {
    throw new Error(`Country feed is not available: ${streamId}/${countrySlug}`);
  }

  const definition = getContentStreamDefinition(streamId);
  const itemsByCountry = countryContext.itemsByStreamIdByCountry.get(streamId) || new Map();
  const items = itemsByCountry.get(selectedCountry.country) || [];
  const pagination = paginateItems(items, currentPage, pageSize);
  const hrefForPage = (pageNumber) => getCountryFeedHref(streamId, selectedCountry.country, pageNumber);

  return {
    generatedAt: normalizedPayload.generatedAt,
    sourcePageUrl: normalizedPayload.sourcePageUrl,
    summary: normalizedPayload.summary,
    streamId,
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
    streamNavItems: buildStreamNavItems(countryContext.contentStreamContext.availableStreams, streamId),
    countryOptions: listCountryFeedOptions(normalizedPayload, streamId, selectedCountry.slug, {
      context: countryContext,
    }),
    homeHref: "/index.html",
    canonicalHref: hrefForPage(pagination.currentPage),
  };
}
