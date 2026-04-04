import { renderCurated } from "../renderCurated.js";

const HELP_LINE = "Usage: npm run curated:render";

/**
 * This CLI is the local-data counterpart to preview:curated: it never fetches
 * feeds and only rebuilds the curated page from stored snapshots.
 */
export async function runRenderCuratedCli({
  argv = process.argv.slice(2),
  logger = console.log,
  renderImpl = renderCurated,
} = {}) {
  if (argv.includes("--help") || argv.includes("-h")) {
    logger(HELP_LINE);
    return;
  }

  logger("[render] starting curated-only render");
  const result = await renderImpl({
    logger,
    writePages: true,
  });

  logger(`Rendered ${Object.keys(result.pages).length} pages into ${result.outputDir}`);
}

async function main() {
  await runRenderCuratedCli();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
