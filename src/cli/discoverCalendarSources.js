import { PATHS, SOURCE_PAGE_URL } from "../config.js";
import { readJson, writeJson } from "../storage.js";
import { refreshCalendarSourcesCatalog } from "../calendarSourceCatalog.js";

export async function runDiscoverCalendarSourcesCli({
  fetchImpl = fetch,
  logger = console.log,
  paths = PATHS,
  readJsonImpl = readJson,
  writeJsonImpl = writeJson,
  sourcePageUrl = SOURCE_PAGE_URL,
} = {}) {
  const result = await refreshCalendarSourcesCatalog({
    sourcePageUrl,
    calendarSourcesPath: paths.calendarSources,
    fetchImpl,
    readJsonImpl,
    writeJsonImpl,
    writeSnapshots: true,
    logger,
  });

  const nextPayload = result.payload;
  logger(`Wrote ${paths.calendarSources}`);
  logger(`Calendar source discovery completed: added=${result.addedCount} total=${nextPayload.items.length}`);

  return nextPayload;
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
