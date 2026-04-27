/**
 * Build a clean, wiki-compatible source-list artifact from the verbose
 * discovery audit payload. This keeps the audit JSON untouched while giving
 * downstream scripts a much smaller list with stable field names.
 */
export function buildDiscoveryValidSourceRowsPayload({ discoveryPayload }) {
  const validEntries = discoveryPayload?.groupedByValidationStatus?.valid ?? [];

  return {
    sourcePageUrl: discoveryPayload?.sourcePageUrl,
    extractedAt: discoveryPayload?.generatedAt,
    urls: validEntries.map(normalizeDiscoveryValidEntry),
  };
}

/**
 * Discovery audit rows use `feedUrl`, but the existing wiki source-list
 * contract expects `candidateFeedUrl`. The clean artifact adopts the wiki
 * contract on purpose so refresh/build can opt into it without extra mapping.
 * `siteUrl` is preserved so the incremental CLI can build the knownSiteUrls
 * set without re-reading the full audit file.
 */
function normalizeDiscoveryValidEntry(entry) {
  return {
    hackerspaceName: entry.hackerspaceName,
    hackerspaceWikiUrl: entry.hackerspaceWikiUrl,
    country: entry.country,
    siteUrl: entry.siteUrl,
    candidateFeedUrl: entry.feedUrl,
    sourceType: "discovery",
  };
}

/**
 * Merge two valid-source entry arrays without duplicates.
 * Keyed by siteUrl — existing entries win on conflict, so a re-run never
 * overwrites a previously confirmed feed.
 */
export function mergeValidSourceEntries(existing, incoming) {
  const knownSiteUrls = new Set(existing.map((entry) => entry.siteUrl));
  const newEntries = incoming.filter((entry) => !knownSiteUrls.has(entry.siteUrl));
  return [...existing, ...newEntries];
}
