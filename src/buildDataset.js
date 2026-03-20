import { SOURCE_PAGE_URL } from "./config.js";
import { normalizeFeed } from "./feedNormalizer.js";
import { parseFeedBody } from "./feedParser.js";
import { probeFeedUrl } from "./feedProbe.js";
import { fetchPageHtml } from "./pageFetcher.js";
import { renderGlobalFeed } from "./renderers/renderGlobalFeed.js";
import { renderAboutPage } from "./renderers/renderAboutPage.js";
import { renderSpaceDetail } from "./renderers/renderSpaceDetail.js";
import { renderSpacesIndex } from "./renderers/renderSpacesIndex.js";
import { extractSourceRows } from "./sourceTableExtractor.js";
import { slugify } from "./utils/slugify.js";
import { filterNormalizedPayloadForDisplay } from "./visibleData.js";
import { buildGlobalFeedModel } from "./viewModels/globalFeed.js";
import { buildSpaceDetailModel } from "./viewModels/spaceDetail.js";
import { buildSpacesIndexModel } from "./viewModels/spacesIndex.js";
import { GLOBAL_FEED_PAGE_SIZE } from "./pagination.js";

export async function buildDataset({
  sourcePageUrl = SOURCE_PAGE_URL,
  fetchImpl = fetch,
  now = Date.now(),
} = {}) {
  const html = await fetchPageHtml({ sourcePageUrl, fetchImpl });
  const sourceRows = extractSourceRows({ html, sourcePageUrl });
  const results = await mapWithConcurrency(sourceRows, 8, async (sourceRow) => {
    const validation = await probeFeedUrl({ sourceRow, fetchImpl });

    if (!validation.fetchOk || !validation.isParsable || !validation.body) {
      return {
        validation: stripBody(validation),
        feed: null,
        failure: {
          rowNumber: sourceRow.rowNumber,
          hackerspaceName: sourceRow.hackerspaceName,
          country: sourceRow.country,
          sourceWikiUrl: sourceRow.hackerspaceWikiUrl,
          candidateUrl: sourceRow.candidateFeedUrl,
          errorCode: validation.errorCode,
          errorMessage: validation.errorMessage,
        },
      };
    }

    try {
      const parsedFeed = await parseFeedBody({ xml: validation.body, validation });
      return {
        validation: stripBody(validation),
        feed: normalizeFeed({
          sourceRow,
          validation,
          parsedFeed,
        }),
        failure: null,
      };
    } catch (error) {
      return {
        validation: stripBody(validation),
        feed: null,
        failure: {
          rowNumber: sourceRow.rowNumber,
          hackerspaceName: sourceRow.hackerspaceName,
          country: sourceRow.country,
          sourceWikiUrl: sourceRow.hackerspaceWikiUrl,
          candidateUrl: sourceRow.candidateFeedUrl,
          errorCode: "parse_error",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      };
    }
  });

  const validations = results.map((entry) => entry.validation);
  const feeds = results.map((entry) => entry.feed).filter(Boolean);
  const failures = results.map((entry) => entry.failure).filter(Boolean);

  const generatedAt = new Date().toISOString();
  const summary = {
    sourceRows: sourceRows.length,
    validFeeds: validations.filter((entry) => entry.isParsable).length,
    parsedFeeds: feeds.filter((entry) => entry.status === "parsed_ok").length,
    emptyFeeds: feeds.filter((entry) => entry.status === "parsed_empty").length,
    failedFeeds: failures.length,
  };

  const normalizedPayload = {
    generatedAt,
    sourcePageUrl,
    feeds,
    failures,
    summary,
  };

  const displayPayload = filterNormalizedPayloadForDisplay(normalizedPayload, { now });

  const spacesIndexModel = buildSpacesIndexModel(displayPayload);
  const spaceSlugs = [
    ...new Set(
      [
        ...feeds.map((feed) => slugify(feed.spaceName)),
        ...failures.map((failure) => slugify(failure.hackerspaceName)),
      ].filter(Boolean),
    ),
  ];

  const pages = {
    "index.html": renderSpacesIndex(spacesIndexModel),
    "about/index.html": renderAboutPage({ sourcePageUrl }),
  };

  const totalGlobalFeedItems = (displayPayload.feeds || []).reduce(
    (count, feed) => count + (feed.items || []).length,
    0,
  );
  const totalGlobalFeedPages = Math.max(1, Math.ceil(totalGlobalFeedItems / GLOBAL_FEED_PAGE_SIZE));

  for (let currentPage = 1; currentPage <= totalGlobalFeedPages; currentPage += 1) {
    const globalFeedModel = buildGlobalFeedModel(displayPayload, { currentPage });
    const relativePath = currentPage === 1 ? "feed/index.html" : `feed/page/${currentPage}/index.html`;
    pages[relativePath] = renderGlobalFeed(globalFeedModel);
  }

  for (const spaceSlug of spaceSlugs) {
    const detailModel = buildSpaceDetailModel(displayPayload, spaceSlug);
    const totalPages = detailModel.totalPages || 1;

    for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
      const pagedModel = buildSpaceDetailModel(displayPayload, spaceSlug, { currentPage });
      const relativePath =
        currentPage === 1
          ? `spaces/${spaceSlug}.html`
          : `spaces/${spaceSlug}/page/${currentPage}/index.html`;
      pages[relativePath] = renderSpaceDetail(pagedModel);
    }
  }

  return {
    sourceRowsPayload: {
      sourcePageUrl,
      sectionTitle: "Spaces with RSS feeds",
      extractedAt: generatedAt,
      urls: sourceRows,
    },
    validationsPayload: validations,
    normalizedPayload,
    site: {
      pages,
    },
  };
}

function stripBody(validation) {
  const { body, ...rest } = validation;
  return rest;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}
