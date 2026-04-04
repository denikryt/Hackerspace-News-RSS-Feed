import { refreshCurated } from "../refreshCurated.js";

const HELP_LINE = "Usage: npm run curated:refresh";

/**
 * This command refreshes only the curated snapshot from the manual YAML list.
 */
export async function runRefreshCuratedCli({
  argv = process.argv.slice(2),
  logger = console.log,
  refreshImpl = refreshCurated,
} = {}) {
  if (argv.includes("--help") || argv.includes("-h")) {
    logger(HELP_LINE);
    return;
  }

  logger("[refresh] starting curated-only refresh");
  const result = await refreshImpl({
    logger,
    writeSnapshot: true,
  });

  logger(`Resolved curated publications ${result.resolvedCount}`);
  logger(`Unresolved curated publications ${result.unresolvedCount}`);
  logger(`Wrote ${result.outputPath}`);
}

async function main() {
  await runRefreshCuratedCli();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
