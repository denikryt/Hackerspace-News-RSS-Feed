import { analyzeWikiDiscoveryUnmatchedResponses } from "../wikiDiscoveryUnmatchedResponseComparison.js";

async function main() {
  console.log("[analyze] starting unmatched wiki/discovery response comparison");

  const result = await analyzeWikiDiscoveryUnmatchedResponses({
    writeArtifact: true,
    logger: (line) => console.log(line),
  });

  console.log(`Compared ${result.summary.unmatchedPairs} unmatched wiki/discovery pairs`);
  console.log(`Same feed content ${result.summary.sameFeedContent}`);
  console.log(`Different feed content ${result.summary.differentFeedContent}`);
  console.log(`Non-XML or unparseable ${result.summary.nonXmlOrUnparseableResponse}`);
  console.log("Wrote analysis/wiki_discovery_unmatched_response_comparison.json");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
