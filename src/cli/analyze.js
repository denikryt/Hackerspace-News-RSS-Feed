import { resolve } from "node:path";

import { PATHS, SOURCE_PAGE_URL } from "../config.js";
import { collectAnalysisFeeds } from "../analysisFeedCollection.js";
import { loadAnalysisSourceRows } from "../analysisSourceRows.js";
import {
  analyzeFeedFields,
  writeFeedFieldInventoryArtifacts,
} from "../feedFieldInventory.js";
import {
  analyzeContentComparison,
  writeContentComparisonArtifact,
} from "./analyzeContentComparison.js";
import { readJson } from "../storage.js";

const ANALYSIS_DIR = resolve(process.cwd(), "analysis");
const DEFAULT_ARTIFACT_PATHS = {
  jsonReport: resolve(ANALYSIS_DIR, "feed_field_inventory.json"),
  markdownReport: resolve(ANALYSIS_DIR, "feed_field_inventory.md"),
  categoryValuesReport: resolve(ANALYSIS_DIR, "observed_category_values.md"),
  categoriesBySpaceReport: resolve(ANALYSIS_DIR, "categories_by_hackerspace.md"),
  contentComparisonReport: resolve(ANALYSIS_DIR, "content_comparison.json"),
};

/**
 * The analyze CLI is now a thin orchestration layer: choose sources, collect
 * feeds once, then build and write the report artifacts from the shared result.
 */
export async function runAnalyzeCli({
  argv = process.argv.slice(2),
  sourcePageUrl = process.env.SOURCE_PAGE_URL || SOURCE_PAGE_URL,
  fetchImpl = fetch,
  readJsonImpl = readJson,
  logger = console.log,
  paths = PATHS,
  loadAnalysisSourceRowsImpl = loadAnalysisSourceRows,
  collectAnalysisFeedsImpl = collectAnalysisFeeds,
  analyzeFeedFieldsImpl = analyzeFeedFields,
  analyzeContentComparisonImpl = analyzeContentComparison,
  writeFeedFieldInventoryArtifactsImpl = writeFeedFieldInventoryArtifacts,
  writeContentComparisonArtifactImpl = writeContentComparisonArtifact,
} = {}) {
  if (argv.includes("--help")) {
    logger("Usage: npm run analyze -- [--include-discovery-valid]");
    return;
  }

  const includeDiscoveryValid = argv.includes("--include-discovery-valid");
  const artifactPaths = resolveArtifactPaths();
  logger("[analyze] starting analysis run");
  logger("[analyze] loading source rows");
  const sourceSelection = await loadAnalysisSourceRowsImpl({
    sourcePageUrl,
    fetchImpl,
    includeDiscoveryValid,
    readJsonImpl,
    paths,
  });
  logger("[analyze] collecting feeds");
  const collection = await collectAnalysisFeedsImpl({
    sourceRows: sourceSelection.sourceRows,
    fetchImpl,
    logger,
  });
  logger("[analyze] building feed field inventory");
  const inventoryReport = await analyzeFeedFieldsImpl({
    sourceRows: sourceSelection.sourceRows,
    collectedRecords: collection.records,
    writeArtifacts: false,
    paths: artifactPaths,
  });
  logger("[analyze] building content comparison");
  const contentComparisonReport = await analyzeContentComparisonImpl({
    sourceRows: sourceSelection.sourceRows,
    collectedRecords: collection.records,
    limit: 100,
    outputPath: artifactPaths.contentComparisonReport,
    logger,
    writeArtifact: false,
  });

  logger("[analyze] writing analysis artifacts");
  await Promise.all([
    writeFeedFieldInventoryArtifactsImpl({
      report: inventoryReport,
      paths: artifactPaths,
    }),
    writeContentComparisonArtifactImpl({
      output: contentComparisonReport,
      outputPath: artifactPaths.contentComparisonReport,
    }),
  ]);

  logger(`[analyze] source mode: ${sourceSelection.selectedSourceMode}`);
  logger(
    `[analyze] selected ${sourceSelection.sourceRows.length} source rows ` +
      `(wiki=${sourceSelection.wikiSourceCount}, discovery-valid=${sourceSelection.discoveryValidSourceCount}, deduped=${sourceSelection.dedupedSourceCount})`,
  );
  logger(`[analyze] analyzed ${inventoryReport.analyzedFeedCount} feeds`);
  logger(`[analyze] wrote ${artifactPaths.jsonReport}`);
  logger(`[analyze] wrote ${artifactPaths.markdownReport}`);
  logger(`[analyze] wrote ${artifactPaths.categoryValuesReport}`);
  logger(`[analyze] wrote ${artifactPaths.categoriesBySpaceReport}`);
  logger(`[analyze] wrote ${artifactPaths.contentComparisonReport}`);
}

function resolveArtifactPaths() {
  return {
    jsonReport: process.env.ANALYSIS_JSON_PATH || DEFAULT_ARTIFACT_PATHS.jsonReport,
    markdownReport: process.env.ANALYSIS_MARKDOWN_PATH || DEFAULT_ARTIFACT_PATHS.markdownReport,
    categoryValuesReport:
      process.env.ANALYSIS_CATEGORY_VALUES_PATH || DEFAULT_ARTIFACT_PATHS.categoryValuesReport,
    categoriesBySpaceReport:
      process.env.ANALYSIS_CATEGORIES_BY_SPACE_PATH || DEFAULT_ARTIFACT_PATHS.categoriesBySpaceReport,
    contentComparisonReport:
      process.env.ANALYSIS_CONTENT_COMPARISON_PATH || DEFAULT_ARTIFACT_PATHS.contentComparisonReport,
  };
}

async function main() {
  await runAnalyzeCli();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
