import { PATHS } from "../config.js";
import { refreshDataset } from "../refreshDataset.js";
import { readJson } from "../storage.js";

export async function runRefreshCli({
  argv = process.argv.slice(2),
  refreshImpl = refreshDataset,
  readJsonImpl = readJson,
  logger = console.log,
  paths = PATHS,
} = {}) {
  if (argv.includes("--help")) {
    logger("Usage: npm run refresh -- [--include-discovery-valid]");
    return;
  }

  const additionalSourceRows = await loadDiscoveryValidSourceRows({ argv, readJsonImpl, paths });

  await refreshImpl({ writeSnapshots: true, logger, additionalSourceRows });

  logger("Refresh completed. Reporting snapshot artifacts.");
  logger(`Wrote ${paths.sourceRows}`);
  logger(`Wrote ${paths.validations}`);
  logger(`Wrote ${paths.normalizedFeeds}`);
  logger(`Wrote ${paths.curatedNormalized}`);
}

async function loadDiscoveryValidSourceRows({ argv, readJsonImpl, paths }) {
  if (!argv.includes("--include-discovery-valid")) {
    return [];
  }

  const payload = await readJsonImpl(paths.discoveredValidSourceRows);
  return Array.isArray(payload?.urls) ? payload.urls : [];
}

async function main() {
  await runRefreshCli();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
