import { PATHS } from "../config.js";
import { buildDiscoveryValidSourceRowsPayload } from "../discoveryValidSourceList.js";
import { readJson, writeJson } from "../storage.js";

export async function runDiscoverValidSourceUrlsCli({
  logger = console.log,
  readJsonImpl = readJson,
  writeJsonImpl = writeJson,
  paths = PATHS,
} = {}) {
  const discoveryPayload = await readJsonImpl(paths.discoveredHackerspaceFeeds);
  const validSourceRowsPayload = buildDiscoveryValidSourceRowsPayload({ discoveryPayload });

  await writeJsonImpl(paths.discoveredValidSourceRows, validSourceRowsPayload);

  logger(`Wrote ${paths.discoveredValidSourceRows}`);
  logger(`Discovery valid source list completed: valid=${validSourceRowsPayload.urls.length}`);

  return validSourceRowsPayload;
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
