import { SOURCE_PAGE_URL } from "../config.js";
import { analyzeFeedFields } from "../feedFieldInventory.js";
import { analyzeContentComparison } from "./analyzeContentComparison.js";

async function main() {
  const sourcePageUrl = process.env.SOURCE_PAGE_URL || SOURCE_PAGE_URL;

  const result = await analyzeFeedFields({
    sourcePageUrl,
    writeArtifacts: true,
    paths: {
      jsonReport: process.env.ANALYSIS_JSON_PATH,
      markdownReport: process.env.ANALYSIS_MARKDOWN_PATH,
      categoriesBySpaceReport: process.env.ANALYSIS_CATEGORIES_BY_SPACE_PATH,
    },
  });

  console.log(`Analyzed ${result.analyzedFeedCount} feeds`);
  console.log(`Wrote ${process.env.ANALYSIS_JSON_PATH || "analysis/feed_field_inventory.json"}`);
  console.log(`Wrote ${process.env.ANALYSIS_MARKDOWN_PATH || "analysis/feed_field_inventory.md"}`);
  console.log(`Wrote ${process.env.ANALYSIS_CATEGORIES_BY_SPACE_PATH || "analysis/categories_by_hackerspace.md"}`);

  // Analyze content field differences
  console.log("\nAnalyzing content/summary/description field differences...");
  await analyzeContentComparison({ sourcePageUrl, limit: 100 });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
