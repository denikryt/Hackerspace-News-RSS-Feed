import { load } from "cheerio";

import { WEBSITE_DISCOVERY_SOURCE_PAGE_URL, PATHS } from "./config.js";
import { parseFeedBody } from "./feedParser.js";
import { probeFeedUrl } from "./feedProbe.js";
import { fetchPageHtml } from "./pageFetcher.js";
import { createRequestScheduler } from "./requestScheduler.js";
import { writeText } from "./storage.js";
import { extractWebsiteSourceRows } from "./websiteSourceExtractor.js";

const DEFAULT_FALLBACK_PATHS = [
  "/feed",
  "/feed/",
  "/?feed=rss2",
  "/?feed=atom",
  "/rss",
  "/rss/",
  "/rss.xml",
  "/rss.xml/",
  "/rss2",
  "/rss2.xml",
  "/atom",
  "/atom/",
  "/atom.xml",
  "/atom.xml/",
  "/feed.xml",
  "/feed.xml/",
  "/feeds/posts/default",
  "/feeds/posts/default?alt=rss",
  "/feeds/posts/default?alt=atom",
  "/index.xml",
  "/index.xml/",
  "/all.xml",
  "/blog/feed",
  "/blog/feed/",
  "/blog/rss",
  "/blog/rss.xml",
  "/news/feed",
  "/news/feed/",
  "/news/rss",
  "/news/rss.xml",
];

const DEFAULT_MIN_REQUEST_DELAY_MS = 250;
const DEFAULT_REQUEST_CONCURRENCY = 6;
const DEFAULT_CANDIDATE_ENDPOINT_DELAY_MS = 1000;
const DEFAULT_DISCOVERY_CANDIDATE_RETRY_DELAYS_MS = [2000];
const SKIPPED_SITE_HOST_PATTERNS = [
  "t.me",
  "telegram.me",
  "facebook.com",
  "fb.com",
  "twitter.com",
  "x.com",
  "instagram.com",
];

export async function discoverHackerspaceFeeds({
  sourcePageUrl = WEBSITE_DISCOVERY_SOURCE_PAGE_URL,
  fetchImpl = fetch,
  paths = PATHS,
  writeTextImpl = writeText,
  writeOutput = false,
  logger = null,
  waitImpl,
  requestConcurrency = DEFAULT_REQUEST_CONCURRENCY,
  minRequestDelayMs = DEFAULT_MIN_REQUEST_DELAY_MS,
  // Sites already in the valid feed list — skipped without any HTTP requests.
  knownSiteUrls = new Set(),
} = {}) {
  const scheduler = createRequestScheduler({
    concurrency: requestConcurrency,
    minDelayMs: minRequestDelayMs,
    waitImpl,
  });
  const scheduledFetchImpl = buildScheduledFetch(fetchImpl, scheduler);
  logInfo(logger, `[discover] fetching source page: ${sourcePageUrl}`);
  const html = await fetchPageHtml({
    sourcePageUrl,
    fetchImpl: scheduledFetchImpl,
    waitImpl,
    logger,
  });
  if (writeOutput) {
    await writeTextImpl(paths.discoveredHackerspaceSourceSnapshot, html);
    logInfo(logger, `[discover] wrote source snapshot: ${paths.discoveredHackerspaceSourceSnapshot}`);
  }
  const sourceRows = extractWebsiteSourceRows({ html, sourcePageUrl });
  logInfo(logger, `[discover] website rows extracted: ${sourceRows.length}`);
  const entries = new Array(sourceRows.length);
  let progressWriteChain = Promise.resolve();

  await mapWithConcurrency(sourceRows, requestConcurrency, async (site, index) => {
      logInfo(logger, `[discover] starting site ${index + 1}/${sourceRows.length}: ${site.siteUrl}`);
      const isKnown = knownSiteUrls.has(site.siteUrl);
      if (isKnown) {
        logInfo(logger, `[discover] [skip] ${site.siteUrl} — already in valid feed list`);
      }
      const entry = isKnown
        ? buildSkippedKnownEntry(site)
        : await discoverFeedForSite({
          site,
          fetchImpl: scheduledFetchImpl,
          waitImpl,
          logger,
        });
      entries[index] = entry;
      logInfo(
        logger,
        `[discover] completed site ${index + 1}/${sourceRows.length}: ${site.siteUrl} (${entry.status}/${entry.validationStatus})`,
      );

      if (writeOutput) {
        progressWriteChain = progressWriteChain.then(() => (
          writeTextImpl(
            paths.discoveredHackerspaceFeeds,
            renderDiscoveryPayloadJson({
              generatedAt: new Date().toISOString(),
              sourcePageUrl,
              entries: entries.filter(Boolean),
            }),
          )
        ));
        await progressWriteChain;
      }
    },
  );

  await progressWriteChain;

  const generatedAt = new Date().toISOString();
  const discoveryPayload = {
    generatedAt,
    sourcePageUrl,
    entries,
    summary: buildSummary(entries),
    groupedByValidationStatus: groupEntriesByValidationStatus(entries),
  };

  // Always write the final complete payload — the progressive writes above only
  // contain entries completed so far and may miss entries that finished early.
  if (writeOutput) {
    await writeTextImpl(
      paths.discoveredHackerspaceFeeds,
      renderDiscoveryPayloadJson({ generatedAt, sourcePageUrl, entries }),
    );
  }

  return {
    sourceRowsPayload: {
      sourcePageUrl,
      extractedAt: generatedAt,
      urls: sourceRows,
    },
    discoveryPayload,
  };
}

export async function discoverFeedForSite({
  site,
  fetchImpl = fetch,
  waitImpl,
  logger,
} = {}) {
  if (shouldSkipSiteDiscovery(site.siteUrl)) {
    return {
      hackerspaceName: site.hackerspaceName,
      hackerspaceWikiUrl: site.hackerspaceWikiUrl || null,
      country: site.country || "",
      siteUrl: site.siteUrl,
      discoveryMethod: null,
      status: "skipped",
      validationStatus: "not_checked",
      validationNote: "Skipped known social-host website entry",
    };
  }

  try {
    const homepageHtml = await fetchPageHtml({
      sourcePageUrl: site.siteUrl,
      fetchImpl,
      waitImpl,
      logger,
    });
    const candidates = buildCandidateUrls({ siteUrl: site.siteUrl, homepageHtml });
    let bestResult = null;

    for (const [candidateIndex, candidate] of candidates.entries()) {
      if (candidateIndex > 0) {
        await waitBetweenCandidateEndpoints(waitImpl);
      }

      const validation = await probeFeedUrl({
        sourceRow: { candidateFeedUrl: candidate.feedUrl },
        fetchImpl,
        waitImpl,
        retryDelaysMs: DEFAULT_DISCOVERY_CANDIDATE_RETRY_DELAYS_MS,
        logger,
      });
      const candidateResult = await buildCandidateResult({ site, candidate, validation });

      if (!candidateResult) {
        continue;
      }

      if (!bestResult || compareValidationPriority(candidateResult, bestResult) < 0) {
        bestResult = candidateResult;
      }

      if (candidateResult.validationStatus === "valid") {
        break;
      }
    }

    if (bestResult) {
      return bestResult;
    }

    return {
      hackerspaceName: site.hackerspaceName,
      hackerspaceWikiUrl: site.hackerspaceWikiUrl || null,
      country: site.country || "",
      siteUrl: site.siteUrl,
      discoveryMethod: null,
      status: "not_found",
      validationStatus: "not_checked",
    };
  } catch (error) {
    return {
      hackerspaceName: site.hackerspaceName,
      hackerspaceWikiUrl: site.hackerspaceWikiUrl || null,
      country: site.country || "",
      siteUrl: site.siteUrl,
      discoveryMethod: null,
      status: "failed",
      validationStatus: "not_checked",
      validationNote: error instanceof Error ? error.message : String(error),
    };
  }
}

async function buildCandidateResult({ site, candidate, validation }) {
  if (!validation.fetchOk) {
    if (candidate.discoveryMethod === "alternate_link") {
      return {
        hackerspaceName: site.hackerspaceName,
        hackerspaceWikiUrl: site.hackerspaceWikiUrl || null,
        country: site.country || "",
        siteUrl: site.siteUrl,
        feedUrl: validation.finalUrl || candidate.feedUrl,
        discoveryMethod: candidate.discoveryMethod,
        status: "confirmed",
        validationStatus: "unreachable",
        validationNote: validation.errorMessage || validation.errorCode || "Candidate endpoint could not be reached",
      };
    }

    return null;
  }

  let validationStatus = "invalid";
  let validationNote;

  if (validation.isParsable && validation.body) {
    try {
      const parsedFeed = await parseFeedBody({ xml: validation.body, validation });
      const itemCount = Array.isArray(parsedFeed.items) ? parsedFeed.items.length : 0;
      validationStatus = itemCount > 0 ? "valid" : "empty";
      validationNote = itemCount > 0 ? undefined : "Feed is parseable but contains no items";
    } catch (error) {
      validationStatus = "invalid";
      validationNote = error instanceof Error ? error.message : String(error);
    }
  } else {
    validationStatus = "invalid";
    validationNote = validation.errorCode || "Candidate endpoint is not a parseable feed";
  }

  return {
    hackerspaceName: site.hackerspaceName,
    hackerspaceWikiUrl: site.hackerspaceWikiUrl || null,
    country: site.country || "",
    siteUrl: site.siteUrl,
    discoveryMethod: candidate.discoveryMethod,
    status: "confirmed",
    validationStatus,
    validationNote,
    ...(validationStatus === "valid" || validationStatus === "empty"
      ? { feedUrl: validation.finalUrl || candidate.feedUrl }
      : {}),
  };
}

function compareValidationPriority(left, right) {
  return validationPriority(left.validationStatus) - validationPriority(right.validationStatus);
}

function validationPriority(status) {
  switch (status) {
    case "valid":
      return 0;
    case "empty":
      return 1;
    case "invalid":
      return 2;
    case "unreachable":
      return 3;
    case "not_checked":
      return 4;
    default:
      return 5;
  }
}

function buildCandidateUrls({ siteUrl, homepageHtml }) {
  const candidates = [];
  const seen = new Set();

  for (const href of extractAlternateFeedUrls({ siteUrl, homepageHtml })) {
    pushCandidate({
      candidates,
      seen,
      feedUrl: href,
      discoveryMethod: "alternate_link",
    });
  }

  for (const path of DEFAULT_FALLBACK_PATHS) {
    pushCandidate({
      candidates,
      seen,
      feedUrl: new URL(path, siteUrl).toString(),
      discoveryMethod: "fallback_path",
    });
  }

  for (const href of buildBlogSubdomainFallbacks(siteUrl)) {
    pushCandidate({
      candidates,
      seen,
      feedUrl: href,
      discoveryMethod: "blog_subdomain_fallback",
    });
  }

  return candidates;
}

function extractAlternateFeedUrls({ siteUrl, homepageHtml }) {
  const $ = load(homepageHtml);

  return $("link[rel]")
    .toArray()
    .filter((element) => {
      const rel = ($(element).attr("rel") || "").toLowerCase();
      const type = ($(element).attr("type") || "").toLowerCase();
      return rel.includes("alternate") && (
        type.includes("rss") ||
        type.includes("atom") ||
        type.includes("xml")
      );
    })
    .map((element) => $(element).attr("href")?.trim())
    .filter(Boolean)
    .map((href) => new URL(href, siteUrl).toString());
}

function buildBlogSubdomainFallbacks(siteUrl) {
  const url = new URL(siteUrl);
  if (url.hostname.startsWith("blog.")) {
    return [];
  }

  const blogOrigin = `${url.protocol}//blog.${url.hostname}`;
  return [
    `${blogOrigin}/feed`,
    `${blogOrigin}/feed/`,
    `${blogOrigin}/rss`,
    `${blogOrigin}/rss.xml`,
    `${blogOrigin}/atom.xml`,
    `${blogOrigin}/feed.xml`,
    `${blogOrigin}/index.xml`,
  ];
}

function pushCandidate({ candidates, seen, feedUrl, discoveryMethod }) {
  if (seen.has(feedUrl)) {
    return;
  }
  seen.add(feedUrl);
  candidates.push({ feedUrl, discoveryMethod });
}

function buildSkippedKnownEntry(site) {
  // Site already has a confirmed valid feed — skip all HTTP work for this run.
  return {
    hackerspaceName: site.hackerspaceName,
    hackerspaceWikiUrl: site.hackerspaceWikiUrl || null,
    country: site.country || "",
    siteUrl: site.siteUrl,
    discoveryMethod: null,
    status: "skipped_known",
    validationStatus: "not_checked",
    validationNote: "Skipped: site already has a known valid feed",
  };
}

function buildSummary(entries) {
  return {
    sites: entries.length,
    confirmed: entries.filter((entry) => entry.status === "confirmed").length,
    skipped: entries.filter((entry) => entry.status === "skipped").length,
    skippedKnown: entries.filter((entry) => entry.status === "skipped_known").length,
    valid: entries.filter((entry) => entry.validationStatus === "valid").length,
    empty: entries.filter((entry) => entry.validationStatus === "empty").length,
    invalid: entries.filter((entry) => entry.validationStatus === "invalid").length,
    unreachable: entries.filter((entry) => entry.validationStatus === "unreachable").length,
    notFound: entries.filter((entry) => entry.status === "not_found").length,
    failed: entries.filter((entry) => entry.status === "failed").length,
  };
}

function renderDiscoveryPayloadJson({ generatedAt, sourcePageUrl, entries }) {
  return `${JSON.stringify({
    generatedAt,
    sourcePageUrl,
    summary: buildSummary(entries),
    groupedByValidationStatus: groupEntriesByValidationStatus(entries),
  }, null, 2)}\n`;
}

function buildScheduledFetch(fetchImpl, scheduler) {
  return async (...args) => scheduler.schedule(() => fetchImpl(...args));
}

function groupEntriesByValidationStatus(entries) {
  const grouped = {
    valid: [],
    empty: [],
    invalid: [],
    unreachable: [],
    not_checked: [],
  };

  for (const entry of entries) {
    if (!entry) {
      continue;
    }

    const groupKey = entry.validationStatus in grouped
      ? entry.validationStatus
      : "not_checked";
    grouped[groupKey].push(entry);
  }

  return grouped;
}

async function waitBetweenCandidateEndpoints(waitImpl = wait) {
  await waitImpl(DEFAULT_CANDIDATE_ENDPOINT_DELAY_MS);
}

function shouldSkipSiteDiscovery(siteUrl) {
  try {
    const hostname = new URL(siteUrl).hostname.toLowerCase();
    return SKIPPED_SITE_HOST_PATTERNS.some((pattern) => (
      hostname === pattern || hostname.endsWith(`.${pattern}`)
    ));
  } catch {
    return false;
  }
}

function wait(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function logInfo(logger, message) {
  if (typeof logger === "function") {
    logger(message);
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}
