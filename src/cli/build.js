import { DIST_DIR, PATHS } from "../config.js";
import { refreshDataset } from "../refreshDataset.js";
import { renderSite } from "../renderSite.js";
import { readJson } from "../storage.js";

export async function runBuildCli({
  argv = process.argv.slice(2),
  refreshImpl = refreshDataset,
  renderImpl = renderSite,
  readJsonImpl = readJson,
  logger = console.log,
  paths = PATHS,
  distDir = DIST_DIR,
} = {}) {
  if (argv.includes("--help")) {
    logger("Usage: npm run build -- [--include-discovery-valid]");
    return;
  }

  const additionalSourceRows = await loadDiscoveryValidSourceRows({ argv, readJsonImpl, paths });
  const refreshResult = await refreshImpl({ writeSnapshots: true, logger, additionalSourceRows });
  logger("Refresh completed. Starting site render.");
  const renderStartedAt = Date.now();
  const renderResult = await renderImpl({
    sourceRowsPayload: refreshResult.sourceRowsPayload,
    validationsPayload: refreshResult.validationsPayload,
    normalizedPayload: refreshResult.normalizedPayload,
    logger,
    writePages: true,
  });
  const renderElapsedMs = Date.now() - renderStartedAt;

  logger(`Wrote ${paths.sourceRows}`);
  logger(`Wrote ${paths.validations}`);
  logger(`Wrote ${paths.normalizedFeeds}`);
  logger(`Rendered ${Object.keys(renderResult.pages).length} pages into ${distDir}`);
  logger(`Rendered ${Object.keys(renderResult.pages).length} pages in ${renderElapsedMs}ms`);
}

async function loadDiscoveryValidSourceRows({ argv, readJsonImpl, paths }) {
  if (!argv.includes("--include-discovery-valid")) {
    return [];
  }

  const payload = await readJsonImpl(paths.discoveredValidSourceRows);
  return Array.isArray(payload?.urls) ? payload.urls : [];
}

async function main() {
  await runBuildCli();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
