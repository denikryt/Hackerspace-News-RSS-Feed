import { resolve } from "node:path";

import { SOURCE_PAGE_URL } from "../config.js";
import { collectAnalysisFeeds } from "../analysisFeedCollection.js";
import { loadAnalysisSourceRows } from "../analysisSourceRows.js";
import { writeJson } from "../storage.js";

const DEFAULT_OUTPUT_PATH = resolve(process.cwd(), "analysis/content_comparison.json");

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function isTextStartOf(snippet, fullText) {
  if (!snippet || !fullText) return false;

  const cleanSnippet = normalizeText(stripHtml(snippet));
  const cleanFull = normalizeText(stripHtml(fullText));

  if (cleanFull.startsWith(cleanSnippet)) {
    return true;
  }

  const minLen = Math.min(cleanSnippet.length, cleanFull.length);
  if (minLen > 100) {
    const snippet80 = cleanSnippet.substring(0, Math.floor(minLen * 0.8));
    return cleanFull.startsWith(snippet80);
  }

  return false;
}

/**
 * Content comparison is a pure local analysis over already parsed feeds. The
 * wrapper can still collect rows itself for direct script use, but the main
 * analyze CLI now injects shared collected records.
 */
export async function analyzeContentComparison({
  sourcePageUrl = SOURCE_PAGE_URL,
  fetchImpl = fetch,
  limit = 1000,
  outputPath = DEFAULT_OUTPUT_PATH,
  logger = console.log,
  sourceRows,
  collectedRecords,
  includeDiscoveryValid = false,
  readJsonImpl,
  analysisPaths,
  writeArtifact = true,
} = {}) {
  const selectedSourceRows = sourceRows || (await loadAnalysisSourceRows({
    sourcePageUrl,
    fetchImpl,
    includeDiscoveryValid,
    readJsonImpl,
    paths: analysisPaths,
  })).sourceRows;
  const records = collectedRecords || (await collectAnalysisFeeds({
    sourceRows: selectedSourceRows,
    fetchImpl,
  })).records;
  const output = buildContentComparisonReport({ collectedRecords: records, limit });

  if (writeArtifact) {
    await writeContentComparisonArtifact({ output, outputPath });
    if (typeof logger === "function") {
      logger(`Written ${output.examples.length} examples to ${outputPath}`);
    }
  }

  return output;
}

/**
 * Only successfully parsed feeds participate in content comparison. Validation
 * and parse failures already belong to the shared collector contract.
 */
export function buildContentComparisonReport({
  collectedRecords,
  limit = 1000,
  generatedAt = new Date().toISOString(),
}) {
  const records = Array.isArray(collectedRecords) ? collectedRecords : [];
  const examples = [];
  let processedFeeds = 0;

  for (const record of records) {
    if (processedFeeds >= limit) {
      break;
    }
    if (record.status !== "parsed") {
      continue;
    }

    const { sourceRow, validation, parsedFeed } = record;
    const items = parsedFeed.items || [];

    for (const item of items) {
      if (!item.content && !item.summary) {
        continue;
      }

      const contentText = item.content || null;
      const summaryText = item.summary || null;
      const snippetText = item.contentSnippet || null;
      const summaryCopiesContentStart =
        summaryText && contentText && isTextStartOf(summaryText, contentText);

      examples.push({
        spaceName: sourceRow.hackerspaceName,
        itemTitle: item.title || "(no title)",
        feedUrl: validation.finalUrl || sourceRow.candidateFeedUrl,
        hasSummary: !!summaryText,
        hasContentSnippet: !!snippetText,
        summaryCopiesContentStart,
        summaryLength: summaryText ? String(summaryText).length : 0,
        contentSnippetLength: snippetText ? String(snippetText).length : 0,
        contentLength: contentText ? String(contentText).length : 0,
        ...(summaryText && { summary: stripHtml(summaryText) }),
      });
    }

    processedFeeds += 1;
  }

  return {
    timestamp: generatedAt,
    feedsProcessed: processedFeeds,
    totalExamples: examples.length,
    itemsWithSummaryOnly: examples.filter((entry) => entry.hasSummary).length,
    itemsWithContentSnippet: examples.filter((entry) => entry.hasContentSnippet).length,
    summaryCopiesContentStartCount: examples.filter((entry) => entry.summaryCopiesContentStart).length,
    avgContentSnippetLength: computeAverageContentSnippetLength(examples),
    examples,
  };
}

/**
 * Artifact writing is kept explicit so the top-level analyze orchestration can
 * build all reports from one collection pass and then persist them.
 */
export async function writeContentComparisonArtifact({
  output,
  outputPath = DEFAULT_OUTPUT_PATH,
} = {}) {
  await writeJson(outputPath, output);
}

function computeAverageContentSnippetLength(examples) {
  const examplesWithSnippets = examples.filter((entry) => entry.contentSnippetLength > 0);

  if (!examplesWithSnippets.length) {
    return 0;
  }

  const totalLength = examplesWithSnippets.reduce((sum, entry) => sum + entry.contentSnippetLength, 0);
  return Math.round(totalLength / examplesWithSnippets.length);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeContentComparison().catch(console.error);
}
