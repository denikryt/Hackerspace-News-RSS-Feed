import { renderCuratedPreview } from "../curatedPreview.js";

const HELP_LINE = "Usage: npm run preview:curated";

export async function runCuratedPreviewCli({
  argv = process.argv.slice(2),
  logger = console.log,
  previewImpl = renderCuratedPreview,
} = {}) {
  if (argv.includes("--help") || argv.includes("-h")) {
    logger(HELP_LINE);
    return;
  }

  logger("[preview] starting curated preview");
  const result = await previewImpl({
    logger,
    writePages: true,
  });

  logger(`Resolved curated publications ${result.resolvedCount}`);
  logger(`Unresolved curated publications ${result.unresolvedCount}`);
  logger(`Rendered ${Object.keys(result.pages).length} pages into ${result.outputDir}`);
}

async function main() {
  await runCuratedPreviewCli();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
