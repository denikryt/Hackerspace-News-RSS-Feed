import { resolve } from "node:path";

import { SOURCE_PAGE_URL } from "./config.js";
import { collectAnalysisFeeds } from "./analysisFeedCollection.js";
import { loadAnalysisSourceRows } from "./analysisSourceRows.js";
import { writeJson, writeText } from "./storage.js";

const ANALYSIS_DIR = resolve(process.cwd(), "analysis");
const DEFAULT_OUTPUT_PATHS = {
  jsonReport: resolve(ANALYSIS_DIR, "missing_content_analysis.json"),
  markdownReport: resolve(ANALYSIS_DIR, "missing_content_analysis.md"),
};
const FEED_LINK_LABEL_MAX_LENGTH = "https://www.fresnoideaworks.org/RSS".length;

/**
 * This analysis works from raw collected feed XML so it can count, per feed,
 * how many original items carried content/content:encoded and description tags.
 */
export async function analyzeMissingContentItems({
  sourcePageUrl = SOURCE_PAGE_URL,
  fetchImpl = fetch,
  sourceRows,
  collectedRecords,
  includeDiscoveryValid = false,
  readJsonImpl,
  analysisPaths,
  writeArtifact = false,
  paths = DEFAULT_OUTPUT_PATHS,
  logger,
  logStages = true,
  loadAnalysisSourceRowsImpl = loadAnalysisSourceRows,
  collectAnalysisFeedsImpl = collectAnalysisFeeds,
  writeMissingContentAnalysisArtifactsImpl = writeMissingContentAnalysisArtifacts,
} = {}) {
  if (logStages) {
    logInfo(logger, "[analyze] loading source rows");
  }
  const selectedSourceRows = sourceRows || (await loadAnalysisSourceRowsImpl({
    sourcePageUrl,
    fetchImpl,
    includeDiscoveryValid,
    readJsonImpl,
    paths: analysisPaths,
  })).sourceRows;
  if (logStages) {
    logInfo(logger, "[analyze] collecting feeds");
  }
  const records = collectedRecords || (await collectAnalysisFeedsImpl({
    sourceRows: selectedSourceRows,
    fetchImpl,
    logger,
  })).records;
  if (logStages) {
    logInfo(logger, "[analyze] building item content tag presence report");
  }
  const report = buildMissingContentAnalysisReport({
    sourceRows: selectedSourceRows,
    collectedRecords: records,
  });

  if (writeArtifact) {
    if (logStages) {
      logInfo(logger, "[analyze] writing analysis artifacts");
    }
    await writeMissingContentAnalysisArtifactsImpl({ report, paths });
  }

  return {
    ...report,
    outputPath: paths.jsonReport,
  };
}

/**
 * The report is feed-oriented because the user needs counts per hackerspace
 * feed, not just one global aggregate.
 */
export function buildMissingContentAnalysisReport({
  sourceRows,
  collectedRecords,
  generatedAt = new Date().toISOString(),
} = {}) {
  const selectedSourceRows = Array.isArray(sourceRows) ? sourceRows : [];
  const records = Array.isArray(collectedRecords) ? collectedRecords : [];
  const feeds = [];
  let totalPublicationCount = 0;
  let itemsWithContentCount = 0;
  let itemsWithDescriptionCount = 0;

  for (const record of records) {
    if (record?.status !== "parsed" || !record.rawXmlBody) {
      continue;
    }

    const itemXmlBlocks = extractItemXmlBlocks(record.rawXmlBody);
    if (itemXmlBlocks.length === 0) {
      continue;
    }

    const totalItems = itemXmlBlocks.length;
    const contentItemCount = itemXmlBlocks.filter((itemXml) => hasRawContentTag(itemXml)).length;
    const descriptionItemCount = itemXmlBlocks.filter((itemXml) => hasTag(itemXml, "description")).length;
    const contentEmptyItemCount = itemXmlBlocks.filter((itemXml) => hasEmptyRawContentTag(itemXml)).length;
    const descriptionEmptyItemCount = itemXmlBlocks.filter((itemXml) => hasEmptyTag(itemXml, "description")).length;

    totalPublicationCount += totalItems;
    itemsWithContentCount += contentItemCount;
    itemsWithDescriptionCount += descriptionItemCount;

    feeds.push({
      hackerspaceName: record.sourceRow?.hackerspaceName || "(unknown)",
      feedUrl: record.validation?.finalUrl || record.sourceRow?.candidateFeedUrl || null,
      totalItems,
      contentItemCount,
      descriptionItemCount,
      contentEmptyItemCount,
      descriptionEmptyItemCount,
    });
  }

  feeds.sort(compareFeedSummaries);

  return {
    generatedAt,
    sourceCount: selectedSourceRows.length,
    analyzedFeedCount: records.filter((record) => record?.status === "parsed").length,
    totalPublicationCount,
    itemsWithContentCount,
    itemsWithDescriptionCount,
    feeds,
  };
}

export function renderMissingContentAnalysisMarkdown(report) {
  const lines = [
    "# Item Content Tag Presence Analysis",
    "",
    `Generated at: ${report.generatedAt}`,
    "",
    `- Parsed feeds: ${report.analyzedFeedCount}`,
    `- Publications analyzed: ${report.totalPublicationCount}`,
    `- Items with raw content/content:encoded: ${report.itemsWithContentCount}`,
    `- Items with raw description: ${report.itemsWithDescriptionCount}`,
    "",
    "Empty tags mean the raw tag exists in the item XML, but carries no value.",
    "",
  ];

  if (!report.feeds?.length) {
    lines.push("No parsed feeds found.", "");
    return `${lines.join("\n")}\n`;
  }

  lines.push("| Hackerspace | Feed | Content | Description | Content empty | Description empty |");
  lines.push("| --- | --- | ---: | ---: | ---: | ---: |");

  for (const feed of report.feeds) {
    lines.push(
      `| ${feed.hackerspaceName} | ${renderMarkdownLink(feed.feedUrl)} | ${feed.contentItemCount} | ${feed.descriptionItemCount} | ${feed.contentEmptyItemCount} | ${feed.descriptionEmptyItemCount} |`,
    );
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

export async function writeMissingContentAnalysisArtifacts({
  report,
  paths = DEFAULT_OUTPUT_PATHS,
} = {}) {
  await Promise.all([
    writeJson(paths.jsonReport, report),
    writeText(paths.markdownReport, renderMissingContentAnalysisMarkdown(report)),
  ]);
}

function extractItemXmlBlocks(xml) {
  const text = String(xml || "");
  const matches = text.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi);
  return matches || [];
}

function hasRawContentTag(itemXml) {
  return hasTag(itemXml, "content:encoded") || hasTag(itemXml, "content");
}

function hasEmptyRawContentTag(itemXml) {
  return hasEmptyTag(itemXml, "content:encoded") || hasEmptyTag(itemXml, "content");
}

/**
 * The report is about raw tag presence in the original item XML, regardless of
 * whether the parser later synthesizes or normalizes content fields.
 */
function hasTag(xml, tagName) {
  const text = String(xml || "");
  const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pairedTagPattern = new RegExp(
    `<${escapedTagName}(?=[\\s>])[^>]*>[\\s\\S]*?<\\/${escapedTagName}\\s*>`,
    "i",
  );
  const selfClosingTagPattern = new RegExp(
    `<${escapedTagName}(?=[\\s>])[^>]*/\\s*>`,
    "i",
  );

  return pairedTagPattern.test(text) || selfClosingTagPattern.test(text);
}

/**
 * Empty tags are counted separately from missing tags so the report can show
 * feeds that emit placeholder content/description nodes with no body.
 */
function hasEmptyTag(xml, tagName) {
  const text = String(xml || "");
  const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pairedTagPattern = new RegExp(
    `<${escapedTagName}(?=[\\s>])[^>]*>([\\s\\S]*?)<\\/${escapedTagName}\\s*>`,
    "i",
  );
  const selfClosingTagPattern = new RegExp(
    `<${escapedTagName}(?=[\\s>])[^>]*/\\s*>`,
    "i",
  );

  if (selfClosingTagPattern.test(text)) {
    return true;
  }

  const match = pairedTagPattern.exec(text);
  if (!match) {
    return false;
  }

  return String(match[1]).trim().length === 0;
}

function compareFeedSummaries(left, right) {
  if (right.contentItemCount !== left.contentItemCount) {
    return right.contentItemCount - left.contentItemCount;
  }

  if (right.descriptionItemCount !== left.descriptionItemCount) {
    return right.descriptionItemCount - left.descriptionItemCount;
  }

  return left.hackerspaceName.localeCompare(right.hackerspaceName);
}

function renderMarkdownLink(url) {
  const label = abbreviateUrl(url, FEED_LINK_LABEL_MAX_LENGTH);
  return `[${label}](${url})`;
}

function abbreviateUrl(url, maxLength) {
  const text = String(url || "");
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

function logInfo(logger, message) {
  if (typeof logger === "function") {
    logger(message);
  }
}
