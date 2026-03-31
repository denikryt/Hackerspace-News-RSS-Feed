import { analyzeWikiDiscoveryComparison } from "../wikiDiscoveryComparison.js";

async function main() {
  const result = await analyzeWikiDiscoveryComparison({ writeArtifact: true });

  console.log(`Compared ${result.summary.wikiUrls} wiki feed URLs`);
  console.log(`Matched ${result.summary.matched}`);
  console.log(`Unmatched ${result.summary.unmatched}`);
  console.log("Wrote analysis/wiki_discovery_feed_url_comparison.json");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
