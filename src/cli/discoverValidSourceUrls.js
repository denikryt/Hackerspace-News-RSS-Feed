import { PATHS } from "../config.js";
import { buildDiscoveryValidSourceRowsPayload } from "../discoveryValidSourceList.js";
import { updateRssFeedRegistry } from "../rssFeedRegistry.js";
import { readJson, writeJson } from "../storage.js";

export async function runDiscoverValidSourceUrlsCli({
  logger = console.log,
  readJsonImpl = readJson,
  writeJsonImpl = writeJson,
  paths = PATHS,
} = {}) {
  const discoveryPayload = await readJsonImpl(paths.discoveredHackerspaceFeeds);
  const validSourceRowsPayload = buildDiscoveryValidSourceRowsPayload({ discoveryPayload });

  const registry = await updateRssFeedRegistry({
    filePath: paths.rssFeeds, newItems: validSourceRowsPayload.items, readJsonImpl, writeJsonImpl,
  });

  logger(`Wrote ${paths.rssFeeds}`);
  logger(`Discovery valid source list completed: valid=${registry.items.length}`);

  return registry;
}

async function main() {
  await runDiscoverValidSourceUrlsCli();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
