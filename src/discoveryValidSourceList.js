/**
 * Build a clean, editable feed registry from the verbose
 * discovery audit payload. This keeps the audit JSON untouched while giving
 * downstream scripts a much smaller list with stable field names.
 */
export function buildDiscoveryValidSourceRowsPayload({ discoveryPayload }) {
  const validEntries = discoveryPayload?.groupedByValidationStatus?.valid ?? [];

  return {
    items: validEntries.map(normalizeDiscoveryValidEntry),
  };
}

// Keep the public registry free of audit-only fields and pipeline terminology.
function normalizeDiscoveryValidEntry(entry) {
  return {
    hackerspaceName: entry.hackerspaceName,
    hackerspaceWikiUrl: entry.hackerspaceWikiUrl,
    country: entry.country,
    website: entry.siteUrl,
    feedUrl: entry.feedUrl,
  };
}

// Keep manual entries authoritative and ignore repeated websites or feed URLs.
export function mergeValidSourceEntries(existing, incoming) {
  const seenWebsites = new Set(existing.map(entry => entry.website).filter(Boolean));
  const seenFeeds = new Set(existing.map(entry => entry.feedUrl));
  const merged = [...existing];
  for (const entry of incoming) {
    if (seenFeeds.has(entry.feedUrl) || (entry.website && seenWebsites.has(entry.website))) continue;
    if (entry.website) seenWebsites.add(entry.website);
    seenFeeds.add(entry.feedUrl);
    merged.push(entry);
  }
  return merged;
}
