import { SOURCE_PAGE_URL } from "./config.js";
import { normalizeFeed } from "./feedNormalizer.js";
import { parseFeedBody } from "./feedParser.js";
import { probeFeedUrl } from "./feedProbe.js";
import { fetchPageHtml } from "./pageFetcher.js";
import { renderGlobalFeed } from "./renderers/renderGlobalFeed.js";
import { renderSpaceDetail } from "./renderers/renderSpaceDetail.js";
import { renderSpacesIndex } from "./renderers/renderSpacesIndex.js";
import { extractSourceRows } from "./sourceTableExtractor.js";
import { slugify } from "./utils/slugify.js";
import { buildGlobalFeedModel } from "./viewModels/globalFeed.js";
import { buildSpaceDetailModel } from "./viewModels/spaceDetail.js";
import { buildSpacesIndexModel } from "./viewModels/spacesIndex.js";

export async function buildDataset({
  sourcePageUrl = SOURCE_PAGE_URL,
  fetchImpl = fetch,
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

  const spacesIndexModel = buildSpacesIndexModel(normalizedPayload);
  const globalFeedModel = buildGlobalFeedModel(normalizedPayload);
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
    "feed/index.html": renderGlobalFeed(globalFeedModel),
  };

  for (const spaceSlug of spaceSlugs) {
    pages[`spaces/${spaceSlug}.html`] = renderSpaceDetail(
      buildSpaceDetailModel(normalizedPayload, spaceSlug),
    );
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
