import { resolve } from "node:path";

import { PATHS } from "./config.js";
import { readJson, writeJson } from "./storage.js";

const DEFAULT_OUTPUT_PATH = resolve(process.cwd(), "analysis/wiki_discovery_feed_url_comparison.json");

// Compare the wiki feed list against discovery results to see which wiki URLs
// are confirmed by discovery and which ones are missing or differ.
export async function analyzeWikiDiscoveryComparison({
  wikiSourceRowsPayload,
  discoveryPayload,
  paths = PATHS,
  writeArtifact = false,
  outputPath = DEFAULT_OUTPUT_PATH,
} = {}) {
  const loadedWikiSourceRowsPayload = wikiSourceRowsPayload ?? await readJson(paths.sourceRows);
  const loadedDiscoveryPayload = discoveryPayload ?? await readJson(paths.discoveredHackerspaceFeeds);

  const discoveryGroups = loadedDiscoveryPayload.groupedByValidationStatus || {};
  const discoveryXmlEntries = [
    ...(discoveryGroups.valid || []),
    ...(discoveryGroups.empty || []),
  ];
  const allDiscoveryEntries = Object.values(discoveryGroups).flat();

  const discoveryXmlEntriesByName = groupByHackerspaceName(discoveryXmlEntries);
  const allDiscoveryEntriesByName = groupByHackerspaceName(allDiscoveryEntries);

  const matched = [];
  const unmatched = [];
  const noDiscoveredXmlFeed = [];
  const noDiscoveryEntry = [];

  for (const sourceRow of loadedWikiSourceRowsPayload.urls || []) {
    const wikiFeedUrl = sourceRow.candidateFeedUrl;
    const hackerspaceName = sourceRow.hackerspaceName || "";
    const normalizedName = normalizeHackerspaceName(hackerspaceName);

    const xmlMatches = discoveryXmlEntriesByName.get(normalizedName) || [];
    const allMatches = allDiscoveryEntriesByName.get(normalizedName) || [];
    const exactXmlMatch = xmlMatches.find((entry) => entry.feedUrl === wikiFeedUrl);

    if (exactXmlMatch) {
      matched.push({
        hackerspaceName,
        wikiFeedUrl,
        discoveryFeedUrl: exactXmlMatch.feedUrl,
        discoveryMethod: exactXmlMatch.discoveryMethod || null,
        discoveryValidationStatus: exactXmlMatch.validationStatus,
        matchType: `exact_${exactXmlMatch.validationStatus}_match`,
      });
      continue;
    }

    if (xmlMatches.length > 0) {
      unmatched.push({
        hackerspaceName,
        wikiFeedUrl,
        reason: "different_discovered_xml_feed",
        discoveryFeedUrl: xmlMatches[0].feedUrl,
        discoveryMethod: xmlMatches[0].discoveryMethod || null,
        discoveryValidationStatuses: uniqueStatuses(xmlMatches),
      });
      continue;
    }

    if (allMatches.length > 0) {
      noDiscoveredXmlFeed.push({
        hackerspaceName,
        wikiFeedUrl,
        reason: "no_discovered_xml_feed",
        discoveryValidationStatuses: uniqueStatuses(allMatches),
      });
      continue;
    }

    noDiscoveryEntry.push({
      hackerspaceName,
      wikiFeedUrl,
      reason: "no_discovery_entry",
    });
  }

  const result = {
    generatedAt: new Date().toISOString(),
    wikiSourcePageUrl: loadedWikiSourceRowsPayload.sourcePageUrl,
    discoverySourcePageUrl: loadedDiscoveryPayload.sourcePageUrl,
    summary: {
      wikiUrls: (loadedWikiSourceRowsPayload.urls || []).length,
      matched: matched.length,
      unmatched: unmatched.length,
      noDiscoveredXmlFeed: noDiscoveredXmlFeed.length,
      noDiscoveryEntry: noDiscoveryEntry.length,
      exactValidMatches: matched.filter((entry) => entry.matchType === "exact_valid_match").length,
      exactEmptyMatches: matched.filter((entry) => entry.matchType === "exact_empty_match").length,
      sameHackerspaceDifferentXmlUrl: unmatched.filter((entry) => entry.reason === "different_discovered_xml_feed").length,
      noDiscoveryXmlFeedForHackerspace: noDiscoveredXmlFeed.length,
      noDiscoveryEntryForHackerspace: noDiscoveryEntry.length,
    },
    matched,
    unmatched,
    noDiscoveredXmlFeed,
    noDiscoveryEntry,
  };

  if (writeArtifact) {
    await writeJson(outputPath, result);
  }

  return result;
}

// Match by hackerspace name because refresh/wiki and discovery artifacts do not
// share a stronger stable join key yet.
function groupByHackerspaceName(entries) {
  const grouped = new Map();

  for (const entry of entries || []) {
    const key = normalizeHackerspaceName(entry.hackerspaceName || "");
    if (!key) {
      continue;
    }

    const current = grouped.get(key) || [];
    current.push(entry);
    grouped.set(key, current);
  }

  return grouped;
}

function normalizeHackerspaceName(value) {
  return String(value || "").trim().toLowerCase();
}

function uniqueStatuses(entries) {
  return [...new Set(entries.map((entry) => entry.validationStatus).filter(Boolean))];
}
