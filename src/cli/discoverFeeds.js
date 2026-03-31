import { PATHS } from "../config.js";
import { discoverHackerspaceFeeds } from "../discoverHackerspaceFeeds.js";

export async function runDiscoverFeedsCli({
  logger = console.log,
  discoverImpl = discoverHackerspaceFeeds,
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
