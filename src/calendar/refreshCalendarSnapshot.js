import { withStagedDirectory } from "../stagedDirectory.js";
import { mapWithConcurrency } from "../mapWithConcurrency.js";
import { normalizeCalendarSnapshot } from "./normalizeCalendarSnapshot.js";
import { fetchBoundedText } from "../http/fetchBoundedText.js";
import { RESOURCE_LIMITS } from "../resourceLimits.js";

import { getAttemptTimeoutMs } from "../networkAttemptTimeout.js";
import { runWithNetworkRetry } from "../networkRetry.js";
import { getCountryFlag } from "../countryFlags.js";
import { readJson, writeText } from "../storage.js";
import { parseCalendarIcsText, sortCalendarEvents } from "./readCalendarEvents.js";

// Calendar sources can be slower than the RSS polling targets, so the refresh
// pipeline gives them a longer final attempt before aborting.
export const DEFAULT_CALENDAR_ATTEMPT_TIMEOUTS_MS = [1000, 2000, 5000];

// Refresh owns network acquisition for calendar sources. The source list must
// contain direct ICS URLs only; refresh snapshots that raw ICS text and
// returns one normalized event payload for the render pipeline to consume
// offline.
export async function refreshCalendarSnapshot({
  calendarSourcesPath,
  sourceItems,
  rawDirectoryPath,
  fetchImpl = fetch,
  readJsonImpl = readJson,
  writeSnapshots = false,
  logger = null,
  waitImpl,
  retryDelaysMs,
  attemptTimeoutsMs,
  writeTextImpl = writeText,
} = {}) {
  const generatedAt = new Date().toISOString();
  const calendarSourceItems = Array.isArray(sourceItems)
    ? normalizeCalendarSourceItems(sourceItems)
    : await loadCalendarSourceItems({ calendarSourcesPath, readJsonImpl });

  const collect = (stage) => mapWithConcurrency(calendarSourceItems, RESOURCE_LIMITS.concurrency, async (sourceItem, sourceIndex) => {
    const snapshotFile = `source-${String(sourceIndex + 1).padStart(3, "0")}.ics`;
    const result = await fetchCalendarSource({
      sourceItem,
      snapshotFile,
      fetchImpl,
      logger,
      waitImpl,
      retryDelaysMs,
      attemptTimeoutsMs: attemptTimeoutsMs || DEFAULT_CALENDAR_ATTEMPT_TIMEOUTS_MS,
    });
    if (stage && result.snapshotFile && result.rawIcsText) await writeTextImpl(`${stage}/${result.snapshotFile}`, result.rawIcsText);
    delete result.rawIcsText;
    return result;
  });
  const sourceResults = writeSnapshots && rawDirectoryPath
    ? await withStagedDirectory(rawDirectoryPath, collect)
    : await collect(null);

  const events = sortCalendarEvents(sourceResults.flatMap((result) => result.events));
  return normalizeCalendarSnapshot(buildCalendarPayload({
    generatedAt,
    items: sourceResults.map(stripCalendarRawText),
    events,
  }));
}

// The source list is hand-maintained and intentionally extensible, so the
// loader accepts only object items with a usable url and ignores the rest.
// Real data currently uses `hs_name`, while some older fixtures used
// `HS_name`, so keep both spellings readable and explicit here.
async function loadCalendarSourceItems({ calendarSourcesPath, readJsonImpl }) {
  if (!calendarSourcesPath) {
    return [];
  }

  let payload;
  try {
    payload = await readJsonImpl(calendarSourcesPath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  return normalizeCalendarSourceItems(Array.isArray(payload?.items) ? payload.items : []);
}

function normalizeCalendarSourceItems(items) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && typeof item === "object" && typeof item.url === "string" && item.url.trim() !== "")
    .map((item) => ({
      ...item,
      country: typeof item.country === "string" && item.country.trim() !== "" ? item.country.trim() : null,
      hackerspaceName: extractHackerspaceName(item),
      url: item.url.trim(),
    }));
}

function extractHackerspaceName(item) {
  const rawValue = typeof item.hs_name === "string" && item.hs_name.trim() !== ""
    ? item.hs_name
    : item.HS_name;

  return typeof rawValue === "string" && rawValue.trim() !== "" ? rawValue.trim() : null;
}

async function fetchCalendarSource({
  sourceItem,
  snapshotFile,
  fetchImpl,
  logger,
  waitImpl,
  retryDelaysMs,
  attemptTimeoutsMs,
}) {
  logInfo(logger, `[refresh] probing calendar source: ${sourceItem.url}`);

  try {
    const primaryResponse = await runWithNetworkRetry({
      run: ({ attemptNumber }) => fetchCalendarSourceWithTimeout({
        sourceUrl: sourceItem.url,
        fetchImpl,
        timeoutMs: getAttemptTimeoutMs({ attemptNumber, timeoutsMs: attemptTimeoutsMs }),
      }),
      waitImpl,
      retryDelaysMs,
      onRetry: ({ attemptNumber, maxAttempts, delayMs, errorCode }) => {
        logInfo(
          logger,
          `[refresh] retrying calendar source fetch: ${sourceItem.url} after ${errorCode} (attempt ${attemptNumber}/${maxAttempts}, wait ${delayMs}ms)`,
        );
      },
    });
    const primaryText = primaryResponse.text;
    const primaryUrl = primaryResponse.finalUrl || sourceItem.url;

    if (!isCalendarResponse({ url: primaryUrl, contentType: primaryResponse.contentType, body: primaryText })) {
      logInfo(logger, `[refresh] failed calendar source: ${sourceItem.url} (non_calendar_response: ${primaryResponse.status})`);
      return {
        ...sourceItem,
        finalUrl: primaryUrl,
        resolvedIcsUrl: null,
        snapshotFile: null,
        status: "fetch_failed",
        events: [],
        rawIcsText: null,
        errorCode: "non_calendar_response",
        errorMessage: "Calendar source did not return ICS data. Calendar sources must be direct ICS URLs.",
      };
    }

    const events = parseCalendarIcsText(primaryText, { sourceFile: snapshotFile })
      .map((event) => ({
        ...event,
        country: sourceItem.country || null,
        countryFlag: getCountryFlag(sourceItem.country),
        hackerspaceName: sourceItem.hackerspaceName || null,
      }));
    logInfo(logger, `[refresh] parsed calendar source: ${sourceItem.url} -> ${primaryUrl} (events=${events.length})`);
    return {
      ...sourceItem,
      finalUrl: primaryUrl,
      resolvedIcsUrl: primaryUrl,
      snapshotFile,
      status: "parsed_ok",
      events,
      rawIcsText: primaryText,
      errorCode: null,
      errorMessage: null,
    };
  } catch (error) {
    logInfo(
      logger,
      `[refresh] failed calendar source: ${sourceItem.url} (fetch_error: ${error instanceof Error ? error.message : String(error)})`,
    );
    return {
      ...sourceItem,
      finalUrl: sourceItem.url,
      resolvedIcsUrl: null,
      snapshotFile: null,
      status: "fetch_failed",
      events: [],
      rawIcsText: null,
      errorCode: error?.code || "fetch_error",
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

function fetchCalendarSourceWithTimeout({ sourceUrl, fetchImpl, timeoutMs }) {
  return fetchBoundedText({ url: sourceUrl, fetchImpl, timeoutMs, maxBodyBytes: RESOURCE_LIMITS.icsMaxBodyBytes,
    headers: {
      "user-agent": "HackerspaceNewsFeed/0.1 (+local)",
      accept: "text/calendar, application/ics, */*",
    }
  });
}

function isCalendarResponse({ url, contentType, body }) {
  const normalizedContentType = String(contentType || "").toLowerCase();
  const normalizedBody = String(body || "").trimStart();

  return normalizedContentType.includes("text/calendar")
    || normalizedContentType.includes("application/ics")
    || String(url || "").toLowerCase().endsWith(".ics")
    || normalizedBody.startsWith("BEGIN:VCALENDAR");
}

function stripCalendarRawText(result) {
  const { rawIcsText, events, ...rest } = result;
  return {
    ...rest,
    eventCount: result.events.length,
  };
}

function buildCalendarPayload({ generatedAt, items, events }) {
  return {
    generatedAt,
    items,
    events,
    summary: {
      sources: items.length,
      parsedSources: items.filter((item) => item.status === "parsed_ok").length,
      parsedEvents: events.length,
      failedSources: items.filter((item) => item.status !== "parsed_ok").length,
    },
  };
}

function logInfo(logger, message) {
  if (typeof logger === "function") {
    logger(message);
  }
}
