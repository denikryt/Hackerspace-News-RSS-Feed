import { PATHS, SOURCE_PAGE_URL } from "../config.js";
import { readJson, writeJson } from "../storage.js";
import {
  extractCalendarFeedUrlFromSpaceApi,
  extractSpaceApiSourceRows,
  mergeDiscoveredCalendarSources,
} from "../spaceApiCalendarSources.js";

export async function runDiscoverCalendarSourcesCli({
  fetchImpl = fetch,
  logger = console.log,
  paths = PATHS,
  readJsonImpl = readJson,
  writeJsonImpl = writeJson,
  sourcePageUrl = SOURCE_PAGE_URL,
} = {}) {
  const sourcePageHtml = await readSourcePageHtml({ fetchImpl, sourcePageUrl });
  const sourceRows = extractSpaceApiSourceRows({
    html: sourcePageHtml,
    sourcePageUrl,
  });
  const existingPayload = await readExistingCalendarSources({ calendarSourcesPath: paths.calendarSources, readJsonImpl });
  const discoveredItems = await discoverCalendarSourceItems({ sourceRows, fetchImpl, logger });
  const mergedPayload = mergeDiscoveredCalendarSources(existingPayload.items, discoveredItems);
  const nextPayload = { items: mergedPayload.items };

  await writeJsonImpl(paths.calendarSources, nextPayload);

  logger(`Wrote ${paths.calendarSources}`);
  logger(`Calendar source discovery completed: added=${mergedPayload.addedCount} total=${nextPayload.items.length}`);

  return nextPayload;
}

async function readSourcePageHtml({ fetchImpl, sourcePageUrl }) {
  const response = await fetchImpl(sourcePageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch source page: ${sourcePageUrl} (${response.status})`);
  }

  return response.text();
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

async function discoverCalendarSourceItems({ sourceRows, fetchImpl, logger }) {
  const discoveredItems = [];

  for (const row of sourceRows) {
    let response;
    try {
      response = await fetchImpl(row.spaceApiUrl);
    } catch (error) {
      logger(
        `[calendar-discovery] skipped ${row.spaceApiUrl} (${error instanceof Error ? error.message : String(error)})`,
      );
      continue;
    }

    if (!response.ok) {
      logger(`[calendar-discovery] skipped ${row.spaceApiUrl} (http ${response.status})`);
      continue;
    }

    const body = await response.text();
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      logger(`[calendar-discovery] skipped ${row.spaceApiUrl} (non_json_response)`);
      continue;
    }

    const calendarUrl = extractCalendarFeedUrlFromSpaceApi(payload);
    if (!calendarUrl) {
      continue;
    }

    discoveredItems.push({
      url: calendarUrl,
      country: row.country,
      hs_name: row.hackerspaceName,
    });
  }

  return discoveredItems;
}

async function main() {
  await runDiscoverCalendarSourcesCli();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
