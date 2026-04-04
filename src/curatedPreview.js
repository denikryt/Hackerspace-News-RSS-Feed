import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { DIST_DIR, PATHS } from "./config.js";
import { enrichFeed } from "./feedEnricher.js";
import { normalizeFeed } from "./feedNormalizer.js";
import { parseFeedBody } from "./feedParser.js";
import { probeFeedUrl } from "./feedProbe.js";
import { collectCuratedSnapshot } from "./curatedSnapshot.js";
import { renderGlobalFeed } from "./renderers/renderGlobalFeed.js";
import { writeText } from "./storage.js";
import { filterNormalizedPayloadForDisplay } from "./visibleData.js";
import { buildCuratedIndexModel } from "./viewModels/curated.js";

const FAVICON_SOURCE_PATH = resolve(process.cwd(), "content/favicon.png");

/**
 * Curated preview intentionally stays narrow: it fetches only the feeds named
 * in curated_publications.yml and renders only the curated page.
 */
export async function renderCuratedPreview({
  paths = PATHS,
  curatedPublicationsPath = paths.curatedPublications,
  distDir = DIST_DIR,
  fetchImpl = fetch,
  now = Date.now(),
  writePages = false,
  logger = null,
  readCuratedPublicationsImpl,
  processCuratedSourceRowsImpl,
} = {}) {
  const snapshot = await collectCuratedSnapshot({
    paths: {
      ...paths,
      curatedPublications: curatedPublicationsPath,
    },
    fetchImpl,
    logger,
    readCuratedPublicationsImpl,
    processCuratedSourceRowsImpl,
  });
  const normalizedPayload = {
    generatedAt: new Date(now).toISOString(),
    sourcePageUrl: null,
    feeds: [],
    curated: snapshot.curatedPayload,
    failures: [],
    summary: {
      sourceRows: snapshot.curatedPayload.summary.requested,
      validFeeds: snapshot.curatedPayload.summary.extraFeedsParsed,
      parsedFeeds: snapshot.curatedPayload.summary.extraFeedsParsed,
      emptyFeeds: 0,
      failedFeeds: snapshot.curatedPayload.summary.extraFeedFailures,
    },
  };
  const displayPayload = filterNormalizedPayloadForDisplay(normalizedPayload, { now });

  logInfo(logger, "[preview] building curated preview page");
  const pages = {
    "curated/index.html": renderGlobalFeed(buildCuratedIndexModel(displayPayload)),
  };

  if (writePages) {
    logInfo(logger, "[preview] writing curated preview files");
    await mkdir(distDir, { recursive: true });
    await Promise.all([
      ...Object.entries(pages).map(([relativePath, html]) =>
        writeText(resolve(distDir, relativePath), html)
      ),
      copyFile(FAVICON_SOURCE_PATH, resolve(distDir, "favicon.png")),
    ]);
  }

  return {
    normalizedPayload,
    pages,
    resolvedCount: snapshot.resolvedCount,
    unresolvedCount: snapshot.unresolvedCount,
    outputDir: distDir,
  };
}

/**
 * Curated preview reuses the main probe/parse/normalize contract so previewed
 * items match the same resolved item shape as the regular refresh flow.
 */
export async function processCuratedSourceRows(sourceRows, { fetchImpl, logger }) {
  const selectedSourceRows = Array.isArray(sourceRows) ? sourceRows : [];

  return Promise.all(selectedSourceRows.map(async (sourceRow, index) => {
    const feedIndex = index + 1;
    logInfo(
      logger,
      `[preview] probing curated feed ${feedIndex}/${selectedSourceRows.length}: ${sourceRow.candidateFeedUrl}`,
    );
    const validation = await probeFeedUrl({ sourceRow, fetchImpl, logger });

    if (!validation.fetchOk || !validation.isParsable || !validation.body) {
      logInfo(
        logger,
        `[preview] failed curated feed ${feedIndex}/${selectedSourceRows.length}: ${sourceRow.candidateFeedUrl} (${validation.errorCode || "unknown_error"}: ${validation.httpStatus || "n/a"})`,
      );
      return {
        feed: null,
        failure: {
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
        `[preview] parsed curated feed ${feedIndex}/${selectedSourceRows.length}: ${sourceRow.candidateFeedUrl} -> ${validation.finalUrl} (items=${enrichedFeed.items.length})`,
      );
      return {
        feed: enrichedFeed,
        failure: null,
      };
    } catch (error) {
      logInfo(
        logger,
        `[preview] failed curated feed ${feedIndex}/${selectedSourceRows.length}: ${sourceRow.candidateFeedUrl} (parse_error: ${error instanceof Error ? error.message : String(error)})`,
      );
      return {
        feed: null,
        failure: {
          candidateUrl: sourceRow.candidateFeedUrl,
          errorCode: "parse_error",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }));
}

function logInfo(logger, message) {
  if (typeof logger === "function") {
    logger(message);
  }
}
