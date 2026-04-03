import { SOURCE_PAGE_URL } from "./config.js";
import { loadDiscoveryValidSourceRows } from "./discoveryValidSourceRows.js";
import { fetchPageHtml } from "./pageFetcher.js";
import { extractSourceRows } from "./sourceTableExtractor.js";

/**
 * Analysis can combine authoritative wiki rows with opt-in discovery-valid
 * rows. Dedupe happens before any feed fetch so both downstream analyses reuse
 * one stable source set.
 */
export async function loadAnalysisSourceRows({
  sourcePageUrl = SOURCE_PAGE_URL,
  fetchImpl = fetch,
  includeDiscoveryValid = false,
  fetchPageHtmlImpl = fetchPageHtml,
  extractSourceRowsImpl = extractSourceRows,
  loadDiscoveryValidSourceRowsImpl = loadDiscoveryValidSourceRows,
  readJsonImpl,
  paths,
} = {}) {
  const html = await fetchPageHtmlImpl({ sourcePageUrl, fetchImpl });
  const wikiSourceRows = extractSourceRowsImpl({ html, sourcePageUrl });
  const discoveryValidSourceRows = await loadDiscoveryValidSourceRowsImpl({
    includeDiscoveryValid,
    readJsonImpl,
    paths,
  });
  const sourceRows = dedupeSourceRowsByCandidateFeedUrl([
    ...wikiSourceRows,
    ...discoveryValidSourceRows,
  ]);

  return {
    sourceRows,
    selectedSourceMode: includeDiscoveryValid ? "wiki+discovery-valid" : "wiki",
    wikiSourceCount: wikiSourceRows.length,
    discoveryValidSourceCount: includeDiscoveryValid ? discoveryValidSourceRows.length : 0,
    dedupedSourceCount: sourceRows.length,
  };
}

/**
 * Wiki rows stay first so they win on overlap. The first version dedupes only
 * on candidate feed URL because that is the expensive network key.
 */
function dedupeSourceRowsByCandidateFeedUrl(sourceRows) {
  const dedupedRows = [];
  const seenFeedUrls = new Set();

  for (const sourceRow of sourceRows) {
    const candidateFeedUrl = sourceRow?.candidateFeedUrl;

    if (!candidateFeedUrl || seenFeedUrls.has(candidateFeedUrl)) {
      continue;
    }

    seenFeedUrls.add(candidateFeedUrl);
    dedupedRows.push(sourceRow);
  }

  return dedupedRows;
}
