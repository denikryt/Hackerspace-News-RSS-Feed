import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { refreshCurated } from "../refreshCurated.js";

const HELP_LINE = "Usage: npm run curated:refresh -- [--force]";

/**
 * This command refreshes only the curated snapshot from the manual YAML list.
 */
export async function runRefreshCuratedCli({
  argv = process.argv.slice(2),
  logger = console.log,
  refreshImpl = refreshCurated,
  confirmForceImpl = confirmForceRefresh,
} = {}) {
  if (argv.includes("--help") || argv.includes("-h")) {
    logger(HELP_LINE);
    return;
  }

  const force = argv.includes("--force");
  if (force) {
    const isConfirmed = await confirmForceImpl();
    if (!isConfirmed) {
      logger("[refresh] force refresh cancelled");
      return;
    }
  }

  logger("[refresh] starting curated-only refresh");
  const result = await refreshImpl({
    logger,
    writeSnapshot: true,
    force,
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

/**
 * Force mode rebuilds already-saved curated entries, so the CLI requires an
 * explicit terminal confirmation before it proceeds.
 */
async function confirmForceRefresh() {
  const rl = createInterface({ input, output });

  try {
    const answer = await rl.question(
      "Force refresh will overwrite existing curated snapshot entries. Continue? [y/N] ",
    );
    return /^(y|yes)$/i.test(String(answer).trim());
  } finally {
    rl.close();
  }
}
