import { parseFeedBody } from "./feedParser.js";
import { probeFeedUrl } from "./feedProbe.js";

const DEFAULT_CONCURRENCY = 4;

/**
 * Both analysis reports work from the same collected feed result set so the
 * pipeline probes and parses each selected feed only once.
 */
export async function collectAnalysisFeeds({
  sourceRows,
  fetchImpl = fetch,
  probeFeedUrlImpl = probeFeedUrl,
  parseFeedBodyImpl = parseFeedBody,
  concurrency = DEFAULT_CONCURRENCY,
  logger,
} = {}) {
  const selectedSourceRows = sourceRows || [];
  const totalCount = selectedSourceRows.length;
  const records = await mapWithConcurrency(selectedSourceRows, concurrency, async (sourceRow, sourceIndex) => {
    logInfo(logger, `[analyze] collecting feed ${sourceIndex + 1}/${totalCount}: ${sourceRow.candidateFeedUrl}`);
    const validation = await probeFeedUrlImpl({ sourceRow, fetchImpl });

    if (!validation.fetchOk || !validation.isParsable || !validation.body) {
      const record = {
        sourceRow,
        validation,
        parsedFeed: null,
        parseError: null,
        rawXmlBody: validation.body || null,
        status: "validation_error",
      };

      logInfo(
        logger,
        `[analyze] collected feed ${sourceIndex + 1}/${totalCount}: ${sourceRow.candidateFeedUrl} (${record.status})`,
      );
      return record;
    }

    try {
      const parsedFeed = await parseFeedBodyImpl({ xml: validation.body, validation });

      const record = {
        sourceRow,
        validation,
        parsedFeed,
        parseError: null,
        rawXmlBody: validation.body,
        status: "parsed",
      };

      logInfo(
        logger,
        `[analyze] collected feed ${sourceIndex + 1}/${totalCount}: ${sourceRow.candidateFeedUrl} (${record.status})`,
      );
      return record;
    } catch (error) {
      const record = {
        sourceRow,
        validation,
        parsedFeed: null,
        parseError: {
          message: error instanceof Error ? error.message : String(error),
        },
        rawXmlBody: validation.body,
        status: "parse_error",
      };

      logInfo(
        logger,
        `[analyze] collected feed ${sourceIndex + 1}/${totalCount}: ${sourceRow.candidateFeedUrl} (${record.status})`,
      );
      return record;
    }
  });

  return {
    sourceRows: selectedSourceRows,
    records,
    parsedFeedRecords: records.filter((record) => record.status === "parsed"),
    failedFeedRecords: records.filter((record) => record.status !== "parsed"),
  };
}

/**
 * Analysis must stay deterministic even when feed work runs concurrently, so
 * results are always written back to their original source-row slot.
 */
async function mapWithConcurrency(items, concurrency, mapper) {
  const list = Array.isArray(items) ? items : [];
  const results = new Array(list.length);
  let index = 0;
  const workerCount = Math.max(1, Math.min(concurrency, list.length || 1));

  async function worker() {
    while (index < list.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(list[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function logInfo(logger, message) {
  if (typeof logger === "function") {
    logger(message);
  }
}
