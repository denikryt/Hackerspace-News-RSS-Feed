import { PATHS } from "../config.js";
import { discoverHackerspaceFeeds } from "../discoverHackerspaceFeeds.js";
import { buildDiscoveryValidSourceRowsPayload } from "../discoveryValidSourceList.js";
import { writeJson } from "../storage.js";

export async function runDiscoverFeedsCli({
  logger = console.log,
  discoverImpl = discoverHackerspaceFeeds,
  writeJsonImpl = writeJson,
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

  // Automatically write the valid source list so it stays in sync with the audit.
  const validSourceRowsPayload = buildDiscoveryValidSourceRowsPayload({
    discoveryPayload: result.discoveryPayload,
  });
  await writeJsonImpl(paths.discoveredValidSourceRows, validSourceRowsPayload);
  logger(`Wrote ${paths.discoveredValidSourceRows}`);
  logger(`Discovery valid source list completed: valid=${validSourceRowsPayload.urls.length}`);

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
