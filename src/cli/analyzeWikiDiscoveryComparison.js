import { analyzeWikiDiscoveryComparison } from "../wikiDiscoveryComparison.js";

export async function runAnalyzeWikiDiscoveryComparisonCli({
  logger = console.log,
  analyzeImpl = analyzeWikiDiscoveryComparison,
} = {}) {
  logger("[analyze] starting wiki/discovery feed URL comparison");
  logger("[analyze] building wiki/discovery feed URL comparison");
  const result = await analyzeImpl({ writeArtifact: true });

  logger("[analyze] writing wiki/discovery feed URL comparison artifact");
  logger(`Compared ${result.summary.wikiUrls} wiki feed URLs`);
  logger(`Matched ${result.summary.matched}`);
  logger(`Unmatched ${result.summary.unmatched}`);
  logger("Wrote analysis/wiki_discovery_feed_url_comparison.json");
}

async function main() {
  await runAnalyzeWikiDiscoveryComparisonCli();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
