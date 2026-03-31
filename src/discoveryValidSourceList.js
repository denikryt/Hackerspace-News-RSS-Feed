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
 */
function normalizeDiscoveryValidEntry(entry) {
  return {
    hackerspaceName: entry.hackerspaceName,
    hackerspaceWikiUrl: entry.hackerspaceWikiUrl,
    country: entry.country,
    candidateFeedUrl: entry.feedUrl,
    sourceType: "discovery",
  };
}
