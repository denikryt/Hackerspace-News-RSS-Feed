import { analyzeMissingContentItems } from "../missingContentAnalysis.js";

const HELP_LINE = "Usage: npm run analyze:item-content-tags -- [--include-discovery-valid]";

export async function runAnalyzeMissingContentCli({
  argv = process.argv.slice(2),
  logger = console.log,
  analyzeImpl = analyzeMissingContentItems,
} = {}) {
  if (argv.includes("--help") || argv.includes("-h")) {
    logger(HELP_LINE);
    return;
  }

  logger("[analyze] starting missing content analysis");
  const includeDiscoveryValid = argv.includes("--include-discovery-valid");
  const result = await analyzeImpl({
    includeDiscoveryValid,
    logger,
    writeArtifact: true,
  });

  logger(`Parsed feeds ${result.analyzedFeedCount}`);
  logger(`Publications analyzed ${result.totalPublicationCount}`);
  logger(`Items with raw content/content:encoded ${result.itemsWithContentCount}`);
  logger(`Items with raw description ${result.itemsWithDescriptionCount}`);
  logger(`Wrote ${result.outputPath}`);
}

async function main() {
  await runAnalyzeMissingContentCli();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
