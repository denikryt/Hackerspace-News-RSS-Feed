import { SOURCE_PAGE_URL, PATHS } from "./config.js";
import {
  buildCuratedSourceRows,
  readCuratedPublications,
  resolveCuratedPublications,
} from "./curated.js";
import { enrichFeed } from "./feedEnricher.js";
import { normalizeFeed } from "./feedNormalizer.js";
import { parseFeedBody } from "./feedParser.js";
import { probeFeedUrl } from "./feedProbe.js";
import { fetchPageHtml } from "./pageFetcher.js";
import { extractSourceRows } from "./sourceTableExtractor.js";
import { writeJson } from "./storage.js";

export async function refreshDataset({
  sourcePageUrl = SOURCE_PAGE_URL,
  fetchImpl = fetch,
  paths = PATHS,
  writeSnapshots = false,
  logger = null,
} = {}) {
  const html = await fetchPageHtml({ sourcePageUrl, fetchImpl, logger });
  const sourceRows = extractSourceRows({ html, sourcePageUrl });
  const curatedSelections = await readCuratedPublications(paths.curatedPublications);
  logInfo(logger, `[refresh] source rows extracted: ${sourceRows.length}`);
  const results = await processSourceRows(sourceRows, { fetchImpl, logger });
  const curatedSourceRows = buildCuratedSourceRows(curatedSelections, sourceRows);
  const curatedFeedResults = await processSourceRows(curatedSourceRows, { fetchImpl, logger });

  const validations = results.map((entry) => entry.validation);
  const feeds = results.map((entry) => entry.feed).filter(Boolean);
  const failures = results.map((entry) => entry.failure).filter(Boolean);
  const curatedFeeds = curatedFeedResults.map((entry) => entry.feed).filter(Boolean);
  const curatedFeedFailures = curatedFeedResults.map((entry) => entry.failure).filter(Boolean);
  const curated = resolveCuratedPublications(curatedSelections, [...feeds, ...curatedFeeds]);
  const generatedAt = new Date().toISOString();

  const result = {
    sourceRowsPayload: {
      sourcePageUrl,
      sectionTitle: "Spaces with RSS feeds",
      extractedAt: generatedAt,
      urls: sourceRows,
    },
    validationsPayload: validations,
    normalizedPayload: {
      generatedAt,
      sourcePageUrl,
      feeds,
      curated: {
        items: curated.items,
        unresolved: curated.unresolved,
        summary: {
          requested: curatedSelections.length,
          resolved: curated.items.length,
          unresolved: curated.unresolved.length,
          extraFeedsParsed: curatedFeeds.length,
          extraFeedFailures: curatedFeedFailures.length,
        },
      },
      failures,
      summary: {
        sourceRows: sourceRows.length,
        validFeeds: validations.filter((entry) => entry.isParsable).length,
        parsedFeeds: feeds.filter((entry) => entry.status === "parsed_ok").length,
        emptyFeeds: feeds.filter((entry) => entry.status === "parsed_empty").length,
        failedFeeds: failures.length,
      },
    },
  };

  if (writeSnapshots) {
    await Promise.all([
      writeJson(paths.sourceRows, result.sourceRowsPayload),
      writeJson(paths.validations, result.validationsPayload),
      writeJson(paths.normalizedFeeds, result.normalizedPayload),
    ]);
  }

  logInfo(logger, `[refresh] refresh complete: feeds=${feeds.length} failures=${failures.length}`);

  return result;
}

async function processSourceRows(sourceRows, { fetchImpl, logger }) {
  return mapWithConcurrency(sourceRows, 4, async (sourceRow) => {
    const feedIndex = sourceRows.indexOf(sourceRow) + 1;
    logInfo(logger, `[refresh] probing feed ${feedIndex}/${sourceRows.length}: ${sourceRow.candidateFeedUrl}`);
    const validation = await probeFeedUrl({ sourceRow, fetchImpl, logger });

    if (!validation.fetchOk || !validation.isParsable || !validation.body) {
      logInfo(
        logger,
        `[refresh] failed feed ${feedIndex}/${sourceRows.length}: ${sourceRow.candidateFeedUrl} (${validation.errorCode || "unknown_error"}: ${validation.httpStatus || "n/a"})`,
      );
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
      const normalizedFeed = normalizeFeed({
        sourceRow,
        validation,
        parsedFeed,
      });
      const enrichedFeed = enrichFeed(normalizedFeed);

      logInfo(
        logger,
        `[refresh] parsed feed ${feedIndex}/${sourceRows.length}: ${sourceRow.candidateFeedUrl} -> ${validation.finalUrl} (items=${enrichedFeed.items.length})`,
      );

      return {
        validation: stripBody(validation),
        feed: enrichedFeed,
        failure: null,
      };
    } catch (error) {
      logInfo(
        logger,
        `[refresh] failed feed ${feedIndex}/${sourceRows.length}: ${sourceRow.candidateFeedUrl} (parse_error: ${error instanceof Error ? error.message : String(error)})`,
      );
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
}

function logInfo(logger, message) {
  if (typeof logger === "function") {
    logger(message);
  }
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
