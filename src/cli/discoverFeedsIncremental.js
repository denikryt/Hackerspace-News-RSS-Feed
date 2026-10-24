/**
 * Incremental discovery mode: skips sites already in the valid feed list and
 * appends only newly found valid feeds. The full-scan `discover:feeds` command
 * is unaffected — this is an opt-in separate entry point.
 */
import { PATHS } from "../config.js";
import { discoverHackerspaceFeeds } from "../discoverHackerspaceFeeds.js";
import { buildDiscoveryValidSourceRowsPayload, mergeValidSourceEntries } from "../discoveryValidSourceList.js";
import { readRssFeedRegistry, validateRssFeedRegistry } from "../rssFeedRegistry.js";
import { readJson, writeJson } from "../storage.js";

export async function runDiscoverFeedsIncrementalCli({
  logger = console.log,
  paths = PATHS,
  fetchImpl = fetch,
  waitImpl,
  discoverImpl = discoverHackerspaceFeeds,
  // Pre-loaded payloads for testing; undefined means load from disk.
  existingValidSourceRows,
  existingAuditPayload,
} = {}) {
  // Load the existing valid source list — used for the merge after discovery.
  let existing = existingValidSourceRows;
  if (existing === undefined) {
    existing = { items: await readRssFeedRegistry({ filePath: paths.rssFeeds }) };
  }

  const existingUrls = existing ? validateRssFeedRegistry(existing) : [];

  // Build knownSiteUrls from the audit file — includes all processed entries
  // regardless of when the valid source list was last written. Only sites with
  // validationStatus "valid" are skipped; all others are re-processed.
  let auditPayload = existingAuditPayload;
  if (auditPayload === undefined) {
    auditPayload = await tryReadJson(paths.discoveredHackerspaceFeeds);
  }
  const auditEntries = [
    ...(auditPayload?.groupedByValidationStatus?.valid ?? []),
  ];
  const knownSiteUrls = new Set(auditEntries.map((entry) => entry.siteUrl).filter(Boolean));

  logInfo(logger, `[discover:incremental] known sites to skip: ${knownSiteUrls.size}`);

  const result = await discoverImpl({
    paths,
    fetchImpl,
    waitImpl,
    writeOutput: true,
    logger,
    knownSiteUrls,
  });

  const newValidPayload = buildDiscoveryValidSourceRowsPayload({
    discoveryPayload: result.discoveryPayload,
  });
  validateRssFeedRegistry(newValidPayload);
  const mergedUrls = mergeValidSourceEntries(existingUrls, newValidPayload.items);
  const newlyAdded = mergedUrls.length - existingUrls.length;

  const mergedPayload = {
    items: mergedUrls,
  };

  await writeJson(paths.rssFeeds, mergedPayload);

  const summary = result.discoveryPayload.summary;
  logInfo(logger, `Wrote ${paths.rssFeeds}`);
  logInfo(
    logger,
    `Discovery incremental completed: sites=${summary.sites} skippedKnown=${summary.skippedKnown} confirmed=${summary.confirmed} valid=${summary.valid} newlyAdded=${newlyAdded} total=${mergedUrls.length}`,
  );

  return { mergedUrls };
}

// Returns parsed JSON or null if the file is missing or unreadable.
async function tryReadJson(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
}

function logInfo(logger, message) {
  if (typeof logger === "function") {
    logger(message);
  }
}

async function main() {
  await runDiscoverFeedsIncrementalCli();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
