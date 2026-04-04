import { PATHS } from "./config.js";
import {
  buildCuratedSourceRows,
  readCuratedPublications,
  resolveCuratedPublications,
} from "./curated.js";
import { processCuratedSourceRows } from "./curatedPreview.js";

/**
 * Curated refresh/preview share the same narrow data-collection path: read the
 * manual YAML list, fetch only the referenced feeds, then resolve only the
 * selected GUIDs into the stable curated snapshot shape.
 */
export async function collectCuratedSnapshot({
  paths = PATHS,
  fetchImpl = fetch,
  logger = null,
  readCuratedPublicationsImpl = readCuratedPublications,
  processCuratedSourceRowsImpl = processCuratedSourceRows,
} = {}) {
  logInfo(logger, "[curated] loading curated selections");
  const curatedSelections = await readCuratedPublicationsImpl(paths.curatedPublications);
  const curatedSourceRows = buildCuratedSourceRows(curatedSelections, []);

  logInfo(logger, "[curated] collecting curated feeds");
  const curatedFeedResults = await processCuratedSourceRowsImpl(curatedSourceRows, {
    fetchImpl,
    logger,
  });

  logInfo(logger, "[curated] resolving curated publications");
  const curatedFeeds = curatedFeedResults.map((entry) => entry.feed).filter(Boolean);
  const curated = resolveCuratedPublications(curatedSelections, curatedFeeds);
  const curatedPayload = buildCuratedPayload({
    curated,
    curatedSelections,
    curatedFeeds,
    curatedFeedResults,
  });

  return {
    curatedPayload,
    resolvedCount: curatedPayload.items.length,
    unresolvedCount: curatedPayload.unresolved.length,
  };
}

/**
 * The dedicated curated artifact stays small: selected items, unresolved
 * selections, and enough summary numbers to explain what happened.
 */
export function buildCuratedPayload({
  curated,
  curatedSelections,
  curatedFeeds,
  curatedFeedResults,
}) {
  return {
    items: curated.items,
    unresolved: curated.unresolved,
    summary: {
      requested: curatedSelections.length,
      resolved: curated.items.length,
      unresolved: curated.unresolved.length,
      extraFeedsParsed: curatedFeeds.length,
      extraFeedFailures: curatedFeedResults.filter((entry) => entry.failure).length,
    },
  };
}

function logInfo(logger, message) {
  if (typeof logger === "function") {
    logger(message);
  }
}
