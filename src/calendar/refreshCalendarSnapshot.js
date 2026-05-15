import { mkdir, rm } from "node:fs/promises";

import { getCountryFlag } from "../countryFlags.js";
import { readJson, writeText } from "../storage.js";
import { parseCalendarIcsText, sortCalendarEvents } from "./readCalendarEvents.js";

// Refresh owns network acquisition for calendar sources. The source list must
// contain direct ICS URLs only; refresh snapshots that raw ICS text and
// returns one normalized event payload for the render pipeline to consume
// offline.
export async function refreshCalendarSnapshot({
  calendarSourcesPath,
  rawDirectoryPath,
  fetchImpl = fetch,
  readJsonImpl = readJson,
  writeSnapshots = false,
  logger = null,
} = {}) {
  const generatedAt = new Date().toISOString();
  const sourceItems = await loadCalendarSourceItems({ calendarSourcesPath, readJsonImpl });

  if (sourceItems.length === 0) {
    return buildCalendarPayload({ generatedAt, items: [], events: [] });
  }

  const sourceResults = await mapWithConcurrency(sourceItems, 4, async (sourceItem, sourceIndex) => {
    const snapshotFile = `source-${String(sourceIndex + 1).padStart(3, "0")}.ics`;
    return fetchCalendarSource({
      sourceItem,
      snapshotFile,
      fetchImpl,
      logger,
    });
  });

  if (writeSnapshots && rawDirectoryPath) {
    await writeCalendarRawSnapshots({ rawDirectoryPath, sourceResults });
  }

  const events = sortCalendarEvents(sourceResults.flatMap((result) => result.events));
  return buildCalendarPayload({
    generatedAt,
    items: sourceResults.map(stripCalendarRawText),
    events,
  });
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

  return (Array.isArray(payload?.items) ? payload.items : [])
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

async function fetchCalendarSource({ sourceItem, snapshotFile, fetchImpl, logger }) {
  logInfo(logger, `[refresh] probing calendar source: ${sourceItem.url}`);

  try {
    const primaryResponse = await fetchImpl(sourceItem.url);
    const primaryText = await primaryResponse.text();
    const primaryUrl = primaryResponse.url || sourceItem.url;

    if (!isCalendarResponse({ url: primaryUrl, contentType: primaryResponse.headers.get("content-type"), body: primaryText })) {
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
      errorCode: "fetch_error",
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

function isCalendarResponse({ url, contentType, body }) {
  const normalizedContentType = String(contentType || "").toLowerCase();
  const normalizedBody = String(body || "").trimStart();

  return normalizedContentType.includes("text/calendar")
    || normalizedContentType.includes("application/ics")
    || String(url || "").toLowerCase().endsWith(".ics")
    || normalizedBody.startsWith("BEGIN:VCALENDAR");
}

async function writeCalendarRawSnapshots({ rawDirectoryPath, sourceResults }) {
  await rm(rawDirectoryPath, { recursive: true, force: true });
  await mkdir(rawDirectoryPath, { recursive: true });

  await Promise.all(sourceResults
    .filter((result) => result.snapshotFile && result.rawIcsText)
    .map((result) => writeText(`${rawDirectoryPath}/${result.snapshotFile}`, result.rawIcsText)));
}

function stripCalendarRawText(result) {
  const { rawIcsText, ...rest } = result;
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
