import { resolve } from "node:path";

import { SOURCE_PAGE_URL } from "./config.js";
import { parseFeedBody } from "./feedParser.js";
import { probeFeedUrl } from "./feedProbe.js";
import { fetchPageHtml } from "./pageFetcher.js";
import { extractSourceRows } from "./sourceTableExtractor.js";
import { writeJson, writeText } from "./storage.js";

const SAMPLE_LIMIT = 3;
const ANALYSIS_DIR = resolve(process.cwd(), "analysis");
const DEFAULT_PATHS = {
  jsonReport: resolve(ANALYSIS_DIR, "feed_field_inventory.json"),
  markdownReport: resolve(ANALYSIS_DIR, "feed_field_inventory.md"),
};

export async function analyzeFeedFields({
  sourcePageUrl = SOURCE_PAGE_URL,
  fetchImpl = fetch,
  writeArtifacts = false,
  paths = DEFAULT_PATHS,
} = {}) {
  const resolvedPaths = {
    ...DEFAULT_PATHS,
    ...(paths || {}),
  };
  const html = await fetchPageHtml({ sourcePageUrl, fetchImpl });
  const sourceRows = extractSourceRows({ html, sourcePageUrl });

  const feedFieldStats = new Map();
  const itemFieldStats = new Map();
  const rawTagStats = new Map();
  const rawNamespacedTagStats = new Map();
  const feeds = [];
  const errors = [];

  for (const sourceRow of sourceRows) {
    const validation = await probeFeedUrl({ sourceRow, fetchImpl });

    if (!validation.fetchOk || !validation.isParsable || !validation.body) {
      errors.push({
        hackerspaceName: sourceRow.hackerspaceName,
        candidateUrl: sourceRow.candidateFeedUrl,
        finalUrl: validation.finalUrl || sourceRow.candidateFeedUrl,
        errorCode: validation.errorCode,
        errorMessage: validation.errorMessage,
      });
      continue;
    }

    try {
      const parsedFeed = await parseFeedBody({ xml: validation.body, validation });
      collectParsedFeedFields(feedFieldStats, parsedFeed, sourceRow.hackerspaceName);
      collectParsedItemFields(itemFieldStats, parsedFeed.items || [], sourceRow.hackerspaceName);
      collectRawXmlTags(rawTagStats, rawNamespacedTagStats, validation.body, sourceRow.hackerspaceName);

      feeds.push(buildFeedRecord({ sourceRow, validation, parsedFeed }));
    } catch (error) {
      errors.push({
        hackerspaceName: sourceRow.hackerspaceName,
        candidateUrl: sourceRow.candidateFeedUrl,
        finalUrl: validation.finalUrl || sourceRow.candidateFeedUrl,
        errorCode: "parse_error",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sourceCount: sourceRows.length,
    analyzedFeedCount: feeds.length,
    failedFeedCount: errors.length,
    parsedFeedFields: serializeFieldStats(feedFieldStats),
    parsedItemFields: serializeFieldStats(itemFieldStats),
    rawXmlTags: serializeFieldStats(rawTagStats),
    rawXmlNamespacedTags: serializeFieldStats(rawNamespacedTagStats),
    authorFieldCandidates: selectCandidates(itemFieldStats, AUTHOR_FIELD_NAMES),
    categoryFieldCandidates: selectCandidates(itemFieldStats, CATEGORY_FIELD_NAMES),
    dateFieldCandidates: selectCandidates(itemFieldStats, DATE_FIELD_NAMES),
    contentFieldCandidates: selectCandidates(itemFieldStats, CONTENT_FIELD_NAMES),
    summaryFieldCandidates: selectCandidates(itemFieldStats, SUMMARY_FIELD_NAMES),
    feedsWithMinimalItems: feeds
      .filter((feed) => feed.hasItems && !feed.hasUsefulContent && !feed.hasAuthorSignals && !feed.hasCategorySignals)
      .map((feed) => pickFeedSummary(feed)),
    feedsWithoutUsefulContent: feeds
      .filter((feed) => feed.hasItems && !feed.hasUsefulContent)
      .map((feed) => pickFeedSummary(feed)),
    sourceSpecificObservations: buildSourceSpecificObservations(feeds),
    examples: feeds.slice(0, SAMPLE_LIMIT).map((feed) => ({
      hackerspaceName: feed.hackerspaceName,
      finalUrl: feed.finalUrl,
      itemFieldExamples: feed.itemFieldExamples,
      rawTagExamples: feed.rawTagExamples,
    })),
    feeds,
    errors,
  };

  if (writeArtifacts) {
    const markdown = renderMarkdownSummary(report);
    await Promise.all([
      writeJson(resolvedPaths.jsonReport, report),
      writeText(resolvedPaths.markdownReport, markdown),
    ]);
  }

  return report;
}

export function renderMarkdownSummary(report) {
  const sections = [
    "# Feed Field Inventory Summary",
    "",
    "## Overview",
    `- Generated at: ${report.generatedAt}`,
    `- Source count: ${report.sourceCount}`,
    `- Analyzed feeds: ${report.analyzedFeedCount}`,
    `- Failed feeds: ${report.failedFeedCount}`,
    "",
    "## Top Author Candidates",
    ...renderCandidateLines(report.authorFieldCandidates),
    "",
    "## Top Category Candidates",
    ...renderCandidateLines(report.categoryFieldCandidates),
    "",
    "## Top Date Candidates",
    ...renderCandidateLines(report.dateFieldCandidates),
    "",
    "## Top Content Candidates",
    ...renderCandidateLines(report.contentFieldCandidates),
    "",
    "## Feeds Requiring Conservative Fallbacks",
    ...renderFeedLines(report.feedsWithMinimalItems),
    "",
    "## Recommended Next Decisions",
    ...renderRecommendations(report),
    "",
  ];

  return `${sections.join("\n")}\n`;
}

function buildFeedRecord({ sourceRow, validation, parsedFeed }) {
  const itemFieldNames = new Set();
  const itemFieldExamples = [];

  for (const item of parsedFeed.items || []) {
    Object.keys(item || {}).forEach((key) => itemFieldNames.add(key));
    if (itemFieldExamples.length < SAMPLE_LIMIT) {
      itemFieldExamples.push(Object.keys(item || {}));
    }
  }

  const rawTagExamples = extractRawTagNames(validation.body).slice(0, SAMPLE_LIMIT);

  return {
    hackerspaceName: sourceRow.hackerspaceName,
    candidateUrl: sourceRow.candidateFeedUrl,
    finalUrl: validation.finalUrl,
    detectedFormat: validation.detectedFormat,
    itemCount: (parsedFeed.items || []).length,
    hasItems: (parsedFeed.items || []).length > 0,
    hasUsefulContent: hasAnyField(itemFieldNames, [...CONTENT_FIELD_NAMES, ...SUMMARY_FIELD_NAMES]),
    hasAuthorSignals: hasAnyField(itemFieldNames, AUTHOR_FIELD_NAMES),
    hasCategorySignals: hasAnyField(itemFieldNames, CATEGORY_FIELD_NAMES),
    itemFieldExamples,
    rawTagExamples,
  };
}

function collectParsedFeedFields(stats, parsedFeed, feedName) {
  for (const [key, value] of Object.entries(parsedFeed || {})) {
    if (key === "items") {
      continue;
    }
    recordField(stats, key, value, feedName, "feed");
  }
}

function collectParsedItemFields(stats, items, feedName) {
  for (const item of items || []) {
    for (const [key, value] of Object.entries(item || {})) {
      recordField(stats, key, value, feedName, "item");
    }
  }
}

function collectRawXmlTags(rawTagStats, rawNamespacedTagStats, xml, feedName) {
  const tagNames = extractRawTagNames(xml);

  for (const tagName of tagNames) {
    const localName = tagName.includes(":") ? tagName.split(":").pop() : tagName;
    recordField(rawTagStats, localName, tagName, feedName, "raw");

    if (tagName.includes(":")) {
      recordField(rawNamespacedTagStats, tagName, tagName, feedName, "raw");
    }
  }
}

function extractRawTagNames(xml) {
  const matches = String(xml || "").matchAll(/<([A-Za-z_][\w.-]*(?::[\w.-]+)?)(?=[\s/>])/g);
  return Array.from(matches, (match) => match[1]);
}

function recordField(stats, name, value, feedName, scope) {
  if (!stats.has(name)) {
    stats.set(name, {
      name,
      count: 0,
      feedNames: new Set(),
      itemCount: 0,
      sampleValues: [],
      sampleFeeds: [],
    });
  }

  const entry = stats.get(name);
  entry.count += 1;
  entry.feedNames.add(feedName);

  if (scope === "item") {
    entry.itemCount += 1;
  }

  maybeAddSample(entry.sampleValues, valueToSample(value));
  maybeAddSample(entry.sampleFeeds, feedName);
}

function serializeFieldStats(stats) {
  return [...stats.values()]
    .map((entry) => ({
      name: entry.name,
      count: entry.count,
      feedCount: entry.feedNames.size,
      itemCount: entry.itemCount || undefined,
      sampleValues: entry.sampleValues,
      sampleFeeds: entry.sampleFeeds,
    }))
    .sort(compareFieldStats);
}

function selectCandidates(stats, names) {
  return serializeFieldStats(
    new Map([...stats.entries()].filter(([name]) => names.has(name))),
  );
}

function buildSourceSpecificObservations(feeds) {
  return feeds
    .filter((feed) => !feed.hasUsefulContent || !feed.hasAuthorSignals || !feed.hasCategorySignals)
    .slice(0, SAMPLE_LIMIT)
    .map((feed) => ({
      hackerspaceName: feed.hackerspaceName,
      finalUrl: feed.finalUrl,
      notes: [
        !feed.hasUsefulContent ? "missing useful content fields" : null,
        !feed.hasAuthorSignals ? "missing author-like fields" : null,
        !feed.hasCategorySignals ? "missing category-like fields" : null,
      ].filter(Boolean),
    }));
}

function pickFeedSummary(feed) {
  return {
    hackerspaceName: feed.hackerspaceName,
    finalUrl: feed.finalUrl,
    itemCount: feed.itemCount,
  };
}

function hasAnyField(fieldNames, candidates) {
  return [...candidates].some((name) => fieldNames.has(name));
}

function maybeAddSample(list, value) {
  if (value == null || value === "") {
    return;
  }
  if (list.includes(value) || list.length >= SAMPLE_LIMIT) {
    return;
  }
  list.push(value);
}

function valueToSample(value) {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (value == null) {
    return null;
  }
  return JSON.stringify(value);
}

function compareFieldStats(left, right) {
  if (right.feedCount !== left.feedCount) {
    return right.feedCount - left.feedCount;
  }
  if (right.count !== left.count) {
    return right.count - left.count;
  }
  return left.name.localeCompare(right.name);
}

function renderCandidateLines(candidates) {
  if (!candidates.length) {
    return ["- none"];
  }

  return candidates.slice(0, 5).map((candidate) => (
    `- \`${candidate.name}\` - ${candidate.feedCount} feeds, ${candidate.count} occurrences`
  ));
}

function renderFeedLines(feeds) {
  if (!feeds.length) {
    return ["- none"];
  }

  return feeds.slice(0, 5).map((feed) => `- ${feed.hackerspaceName} (${feed.itemCount} items)`);
}

function renderRecommendations(report) {
  const lines = [];

  if (report.authorFieldCandidates[0]) {
    lines.push(`- Start author resolution from \`${report.authorFieldCandidates[0].name}\`.`);
  }
  if (report.categoryFieldCandidates.length) {
    lines.push(`- Build the first category mapping from \`${report.categoryFieldCandidates[0].name}\`.`);
  }
  if (report.contentFieldCandidates.length || report.summaryFieldCandidates.length) {
    const contentName = report.contentFieldCandidates[0]?.name || "none";
    const summaryName = report.summaryFieldCandidates[0]?.name || "none";
    lines.push(`- Prefer \`${contentName}\` for content-like text and \`${summaryName}\` as summary fallback.`);
  }
  if (report.feedsWithMinimalItems.length) {
    lines.push("- Keep a conservative classification fallback for feeds with minimal item structure.");
  }

  return lines.length ? lines : ["- No strong recommendations yet."];
}

const AUTHOR_FIELD_NAMES = new Set(["author", "creator", "dc:creator"]);
const CATEGORY_FIELD_NAMES = new Set(["categories", "category"]);
const DATE_FIELD_NAMES = new Set(["pubDate", "isoDate", "published", "updated"]);
const CONTENT_FIELD_NAMES = new Set(["content", "content:encoded", "contentEncoded"]);
const SUMMARY_FIELD_NAMES = new Set(["contentSnippet", "summary", "description"]);
