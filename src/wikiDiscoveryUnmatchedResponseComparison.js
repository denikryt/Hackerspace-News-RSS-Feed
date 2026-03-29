import { resolve } from "node:path";

import { parseFeedBody } from "./feedParser.js";
import { probeFeedUrl } from "./feedProbe.js";
import { readJson, writeJson } from "./storage.js";

const DEFAULT_INPUT_PATH = resolve(process.cwd(), "analysis/wiki_discovery_feed_url_comparison.json");
const DEFAULT_OUTPUT_PATH = resolve(process.cwd(), "analysis/wiki_discovery_unmatched_response_comparison.json");

// Compare the actual network responses behind unmatched wiki/discovery URL pairs.
// The goal is to answer whether the two different URLs still resolve to the same
// feed content, or whether they are genuinely different feeds.
export async function analyzeWikiDiscoveryUnmatchedResponses({
  comparisonPayload,
  inputPath = DEFAULT_INPUT_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
  fetchImpl = fetch,
  writeArtifact = false,
  logger,
  attemptCount = 3,
  attemptTimeoutsMs,
  retryDelaysMs,
} = {}) {
  const loadedComparisonPayload = comparisonPayload ?? await readJson(inputPath);
  const unmatchedEntries = loadedComparisonPayload.unmatched || [];
  const attemptProfile = buildAnalysisAttemptProfile({
    attemptCount,
    attemptTimeoutsMs,
    retryDelaysMs,
  });

  const results = [];

  for (const [index, entry] of unmatchedEntries.entries()) {
    if (typeof logger === "function") {
      logger(`[analyze] comparing unmatched pair ${index + 1}/${unmatchedEntries.length}: ${entry.hackerspaceName}`);
    }

    const wikiProbe = await probeAsAnalysisInput({
      feedUrl: entry.wikiFeedUrl,
      fetchImpl,
      ...attemptProfile,
    });
    const discoveryProbe = await probeAsAnalysisInput({
      feedUrl: entry.discoveryFeedUrl,
      fetchImpl,
      ...attemptProfile,
    });

    const comparison = compareProbeResults({
      wikiProbe,
      discoveryProbe,
    });

    const resultEntry = {
      hackerspaceName: entry.hackerspaceName,
      wikiFeedUrl: entry.wikiFeedUrl,
      discoveryFeedUrl: entry.discoveryFeedUrl,
      discoveryMethod: entry.discoveryMethod || null,
      wikiResponse: summarizeProbe(wikiProbe),
      discoveryResponse: summarizeProbe(discoveryProbe),
      comparison,
    };

    results.push(resultEntry);

    if (typeof logger === "function") {
      logger(
        `[analyze] completed unmatched pair ${index + 1}/${unmatchedEntries.length}: ${entry.hackerspaceName} -> ${comparison.verdict}`,
      );
    }
  }

  const result = {
    generatedAt: new Date().toISOString(),
    sourceComparisonGeneratedAt: loadedComparisonPayload.generatedAt || null,
    summary: buildSummary(results),
    sameFeedContent: results.filter((entry) => entry.comparison.verdict === "same_feed_content"),
    differentFeedContent: results.filter((entry) => entry.comparison.verdict === "different_feed_content"),
    nonXmlOrUnparseableResponse: results.filter(
      (entry) => entry.comparison.verdict === "non_xml_or_unparseable_response",
    ),
  };

  if (writeArtifact) {
    await writeJson(outputPath, result);
  }

  return result;
}

// Probe one URL exactly once for this analysis. Discovery already told us which
// URLs are worth comparing; here we only want the real response, not another
// expensive retry cascade.
async function probeAsAnalysisInput({
  feedUrl,
  fetchImpl,
  retryDelaysMs,
  attemptTimeoutsMs,
}) {
  const validation = await probeFeedUrl({
    sourceRow: { candidateFeedUrl: feedUrl },
    fetchImpl,
    retryDelaysMs,
    attemptTimeoutsMs,
  });

  if (!validation.isParsable || !validation.body) {
    return {
      validation,
      parsedFeed: null,
      signature: null,
    };
  }

  try {
    const parsedFeed = await parseFeedBody({ xml: validation.body, validation });

    return {
      validation,
      parsedFeed,
      signature: buildFeedSignature(parsedFeed),
    };
  } catch {
    return {
      validation: {
        ...validation,
        isParsable: false,
        errorCode: "parse_error",
      },
      parsedFeed: null,
      signature: null,
    };
  }
}

// The unmatched-url analysis is slower and more targeted than discovery, so it
// gets its own probe profile. By default it stays on a single 1s attempt, but
// callers can opt into a small linear schedule such as 1s/2s/3s.
export function buildAnalysisAttemptProfile({
  attemptCount = 3,
  attemptTimeoutsMs,
  retryDelaysMs,
} = {}) {
  const normalizedAttemptCount = Number.isFinite(attemptCount) && attemptCount > 0
    ? Math.floor(attemptCount)
    : 1;

  return {
    attemptTimeoutsMs: attemptTimeoutsMs || buildLinearSchedule({ count: normalizedAttemptCount }),
    retryDelaysMs: retryDelaysMs || buildLinearSchedule({ count: normalizedAttemptCount - 1 }),
  };
}

// Collapse a feed into a small signature that is stable enough for
// "same feed or not" diagnostics without storing the whole XML in the result.
function buildFeedSignature(parsedFeed) {
  const itemLinks = (parsedFeed.items || [])
    .map((item) => normalizeUrl(item.link))
    .filter(Boolean)
    .slice(0, 20);

  return {
    title: normalizeText(parsedFeed.title),
    siteLink: normalizeUrl(parsedFeed.link),
    itemCount: (parsedFeed.items || []).length,
    itemLinks,
  };
}

function summarizeProbe(probe) {
  return {
    finalUrl: probe.validation.finalUrl,
    httpStatus: probe.validation.httpStatus,
    contentType: probe.validation.contentType,
    detectedFormat: probe.validation.detectedFormat,
    errorCode: probe.validation.errorCode,
    feedTitle: probe.signature?.title || null,
    feedSiteLink: probe.signature?.siteLink || null,
    itemCount: probe.signature?.itemCount || 0,
    itemLinks: probe.signature?.itemLinks || [],
  };
}

function compareProbeResults({ wikiProbe, discoveryProbe }) {
  const sameFinalUrl =
    normalizeUrl(wikiProbe.validation.finalUrl) !== null &&
    normalizeUrl(wikiProbe.validation.finalUrl) === normalizeUrl(discoveryProbe.validation.finalUrl);

  const sameBody =
    Boolean(wikiProbe.validation.body) &&
    wikiProbe.validation.body === discoveryProbe.validation.body;

  const sharedItemLinksCount = countSharedValues(
    wikiProbe.signature?.itemLinks || [],
    discoveryProbe.signature?.itemLinks || [],
  );

  const sameFeedIdentity = haveSameFeedIdentity({
    wikiSignature: wikiProbe.signature,
    discoverySignature: discoveryProbe.signature,
    sharedItemLinksCount,
  });

  return {
    verdict: buildVerdict({
      wikiProbe,
      discoveryProbe,
      sameFinalUrl,
      sameBody,
      sameFeedIdentity,
    }),
    sameFinalUrl,
    sameBody,
    sameFeedIdentity,
    sharedItemLinksCount,
  };
}

function haveSameFeedIdentity({ wikiSignature, discoverySignature, sharedItemLinksCount }) {
  if (!wikiSignature || !discoverySignature) {
    return false;
  }

  const sameTitle = wikiSignature.title && wikiSignature.title === discoverySignature.title;
  const sameSiteLink =
    wikiSignature.siteLink &&
    wikiSignature.siteLink === discoverySignature.siteLink;

  // Atom/RSS variants of the same feed often differ only in feed-level link
  // canonicalization (http vs https, locale path, trailing slash), while still
  // exposing the same entry URLs. Shared item links are therefore the stronger
  // signal here.
  if (sameTitle && sharedItemLinksCount > 0) {
    return true;
  }

  return sameTitle && sameSiteLink && wikiSignature.itemCount === 0 && discoverySignature.itemCount === 0;
}

function buildVerdict({ wikiProbe, discoveryProbe, sameFinalUrl, sameBody, sameFeedIdentity }) {
  if (!wikiProbe.validation.isParsable || !discoveryProbe.validation.isParsable) {
    return "non_xml_or_unparseable_response";
  }

  if (sameBody || sameFinalUrl) {
    return "same_feed_content";
  }

  if (sameFeedIdentity) {
    return "same_feed_content";
  }

  return "different_feed_content";
}

function buildSummary(results) {
  return {
    unmatchedPairs: results.length,
    sameFeedContent: results.filter((entry) => entry.comparison.verdict === "same_feed_content").length,
    differentFeedContent: results.filter((entry) => entry.comparison.verdict === "different_feed_content").length,
    nonXmlOrUnparseableResponse: results.filter((entry) => entry.comparison.verdict === "non_xml_or_unparseable_response").length,
  };
}

function normalizeText(value) {
  const text = String(value || "").trim();
  return text || null;
}

function normalizeUrl(value) {
  const text = String(value || "").trim();
  return text || null;
}

function countSharedValues(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value)).length;
}

function buildLinearSchedule({ count }) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => (index + 1) * 1000);
}
