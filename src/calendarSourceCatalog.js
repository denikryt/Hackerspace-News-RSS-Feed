import { getAttemptTimeoutMs } from "./networkAttemptTimeout.js";
import { runWithNetworkRetry } from "./networkRetry.js";
import { fetchPageHtml } from "./pageFetcher.js";
import { readJson, writeJson } from "./storage.js";
import {
  extractCalendarFeedUrlFromSpaceApi,
  extractSpaceApiSourceRows,
  mergeDiscoveredCalendarSources,
} from "./spaceApiCalendarSources.js";

// Calendar refresh treats the SpaceAPI section as a source-discovery stage.
// It updates the hand-edited ICS catalog first, then the ICS fetch stage reads
// from that catalog as the single source of truth for calendar URLs.
export async function refreshCalendarSourcesCatalog({
  sourcePageUrl,
  sourcePageHtml,
  calendarSourcesPath,
  fetchImpl = fetch,
  readJsonImpl = readJson,
  writeJsonImpl = writeJson,
  writeSnapshots = false,
  logger = null,
  allowMissingSection = false,
  waitImpl,
  retryDelaysMs,
  attemptTimeoutsMs,
} = {}) {
  const html = typeof sourcePageHtml === "string"
    ? sourcePageHtml
    : await fetchPageHtml({ sourcePageUrl, fetchImpl, logger });

  const sourceRows = readSpaceApiSourceRows({ html, sourcePageUrl, allowMissingSection, logger });
  const existingPayload = await readExistingCalendarSources({ calendarSourcesPath, readJsonImpl });
  const discoveredItems = await discoverCalendarSourceItems({
    sourceRows,
    fetchImpl,
    logger,
    waitImpl,
    retryDelaysMs,
    attemptTimeoutsMs,
  });
  const mergedPayload = mergeDiscoveredCalendarSources(existingPayload.items, discoveredItems);
  const nextPayload = { items: mergedPayload.items };

  if (writeSnapshots && calendarSourcesPath) {
    await writeJsonImpl(calendarSourcesPath, nextPayload);
  }

  logInfo(
    logger,
    `[refresh] calendar source catalog prepared: discovered=${discoveredItems.length} added=${mergedPayload.addedCount} total=${nextPayload.items.length}`,
  );

  return {
    payload: nextPayload,
    sourceRows,
    discoveredItems,
    addedCount: mergedPayload.addedCount,
  };
}

function readSpaceApiSourceRows({ html, sourcePageUrl, allowMissingSection, logger }) {
  try {
    return extractSpaceApiSourceRows({ html, sourcePageUrl });
  } catch (error) {
    if (!allowMissingSection) {
      throw error;
    }

    logInfo(
      logger,
      `[refresh] calendar source catalog skipped: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

async function readExistingCalendarSources({ calendarSourcesPath, readJsonImpl }) {
  try {
    const payload = await readJsonImpl(calendarSourcesPath);
    return {
      items: Array.isArray(payload?.items) ? payload.items : [],
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return { items: [] };
    }
    throw error;
  }
}

async function discoverCalendarSourceItems({
  sourceRows,
  fetchImpl,
  logger,
  waitImpl,
  retryDelaysMs,
  attemptTimeoutsMs,
}) {
  const uniqueRows = dedupeSpaceApiRows(sourceRows);
  const discoveredItems = await mapWithConcurrency(uniqueRows, 4, async (row) => {
    let response;
    try {
      response = await runWithNetworkRetry({
        run: ({ attemptNumber }) => fetchSpaceApiWithTimeout({
          url: row.spaceApiUrl,
          fetchImpl,
          timeoutMs: getAttemptTimeoutMs({ attemptNumber, timeoutsMs: attemptTimeoutsMs }),
        }),
        waitImpl,
        retryDelaysMs,
        onRetry: ({ attemptNumber, maxAttempts, delayMs, errorCode }) => {
          logInfo(
            logger,
            `[calendar-discovery] retrying ${row.spaceApiUrl} after ${errorCode} (attempt ${attemptNumber}/${maxAttempts}, wait ${delayMs}ms)`,
          );
        },
      });
    } catch (error) {
      logInfo(
        logger,
        `[calendar-discovery] skipped ${row.spaceApiUrl} (${error instanceof Error ? error.message : String(error)})`,
      );
      return null;
    }

    if (!response.ok) {
      logInfo(logger, `[calendar-discovery] skipped ${row.spaceApiUrl} (http ${response.status})`);
      return null;
    }

    const body = await response.text();
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      logInfo(logger, `[calendar-discovery] skipped ${row.spaceApiUrl} (non_json_response)`);
      return null;
    }

    const calendarUrl = extractCalendarFeedUrlFromSpaceApi(payload);
    if (!calendarUrl) {
      return null;
    }

    return {
      url: calendarUrl,
      country: row.country,
      hs_name: row.hackerspaceName,
    };
  });

  return discoveredItems.filter(Boolean);
}

function dedupeSpaceApiRows(sourceRows) {
  const uniqueRows = [];
  const seen = new Set();

  for (const row of Array.isArray(sourceRows) ? sourceRows : []) {
    const dedupeKey = typeof row?.spaceApiUrl === "string" ? row.spaceApiUrl.trim() : "";
    if (!dedupeKey || seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    uniqueRows.push(row);
  }

  return uniqueRows;
}

function fetchSpaceApiWithTimeout({ url, fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetchImpl(url, {
    redirect: "follow",
    signal: controller.signal,
    headers: {
      "user-agent": "HackerspaceNewsFeed/0.1 (+local)",
      accept: "application/json, */*",
    },
  }).finally(() => clearTimeout(timeoutId));
}

function logInfo(logger, message) {
  if (typeof logger === "function") {
    logger(message);
  }
}

// Discovery should stay polite to remote endpoints, but it does not need to
// be fully sequential. A small fixed worker pool keeps refresh moving without
// flooding a page full of stale SpaceAPI links.
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
