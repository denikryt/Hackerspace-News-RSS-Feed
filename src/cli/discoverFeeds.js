import { PATHS } from "../config.js";
import { discoverHackerspaceFeeds } from "../discoverHackerspaceFeeds.js";
import { buildDiscoveryValidSourceRowsPayload } from "../discoveryValidSourceList.js";
import { updateRssFeedRegistry } from "../rssFeedRegistry.js";
import { readJson, writeJson } from "../storage.js";

export async function runDiscoverFeedsCli({
  logger = console.log,
  discoverImpl = discoverHackerspaceFeeds,
  writeJsonImpl = writeJson,
  readJsonImpl = readJson,
  paths = PATHS,
} = {}) {
  const result = await discoverImpl({
    paths,
    writeOutput: true,
    logger,
  });
  const summary = result.discoveryPayload.summary;

  logger(`Wrote ${paths.discoveredHackerspaceSourceSnapshot}`);
  logger(`Wrote ${paths.discoveredHackerspaceFeeds}`);
  logger(
    `Discovery completed: sites=${summary.sites} confirmed=${summary.confirmed} valid=${summary.valid}`,
  );

  // Append discovered feeds without overwriting public registry entries.
  const validSourceRowsPayload = buildDiscoveryValidSourceRowsPayload({
    discoveryPayload: result.discoveryPayload,
  });
  const registry = await updateRssFeedRegistry({
    filePath: paths.rssFeeds, newItems: validSourceRowsPayload.items, readJsonImpl, writeJsonImpl,
  });
  logger(`Wrote ${paths.rssFeeds}`);
  logger(`Discovery valid source list completed: valid=${registry.items.length}`);

  return result;
}

async function main() {
  await runDiscoverFeedsCli();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
