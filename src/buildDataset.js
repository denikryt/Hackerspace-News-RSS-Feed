import { SOURCE_PAGE_URL } from "./config.js";
import { normalizeFeed } from "./feedNormalizer.js";
import { parseFeedBody } from "./feedParser.js";
import { probeFeedUrl } from "./feedProbe.js";
import { fetchPageHtml } from "./pageFetcher.js";
import { renderHtmlPage } from "./renderHtmlPage.js";
import { extractSourceRows } from "./sourceTableExtractor.js";

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

  return {
    sourceRowsPayload: {
      sourcePageUrl,
      sectionTitle: "Spaces with RSS feeds",
      extractedAt: generatedAt,
      urls: sourceRows,
    },
    validationsPayload: validations,
    normalizedPayload,
    html: renderHtmlPage({
      sourcePageUrl,
      generatedAt,
      summary,
      feeds,
      failures,
    }),
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
