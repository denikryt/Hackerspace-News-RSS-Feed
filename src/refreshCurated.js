import { PATHS } from "./config.js";
import { collectCuratedSnapshot } from "./curatedSnapshot.js";
import { readJson, writeJson } from "./storage.js";
import { readCuratedPublications } from "./curated.js";

/**
 * Curated-only refresh updates just the dedicated curated snapshot. It leaves
 * the main feed snapshots untouched so the command stays narrow and cheap.
 */
export async function refreshCurated({
  paths = PATHS,
  fetchImpl = fetch,
  writeSnapshot = false,
  force = false,
  logger = null,
  readCuratedPublicationsImpl,
  processCuratedSourceRowsImpl,
} = {}) {
  const existingPayload = force ? emptyCuratedPayload() : await readExistingCuratedPayload(paths);
  const curatedSelections = await (readCuratedPublicationsImpl ?? readCuratedPublications)(
    paths.curatedPublications,
  );
  const missingSelections = force
    ? curatedSelections
    : curatedSelections.filter((entry) => !hasCuratedSelection(existingPayload, entry));

  const newPayload = missingSelections.length > 0
    ? (await collectCuratedSnapshot({
        paths,
        curatedSelections: missingSelections,
        fetchImpl,
        logger,
        readCuratedPublicationsImpl,
        processCuratedSourceRowsImpl,
      })).curatedPayload
    : emptyCuratedPayload();

  const curatedPayload = mergeCuratedPayload(existingPayload, newPayload);

  if (writeSnapshot) {
    await writeJson(paths.curatedNormalized, curatedPayload);
  }

  return {
    curatedPayload,
    resolvedCount: curatedPayload.items.length,
    unresolvedCount: curatedPayload.unresolved.length,
    outputPath: paths.curatedNormalized,
  };
}

/**
 * Incremental curated refresh keeps the existing snapshot authoritative for
 * already-saved selections and fetches only YAML entries that are still absent.
 */
function hasCuratedSelection(curatedPayload, entry) {
  const selectionKey = buildSelectionKey(entry);

  return [
    ...(curatedPayload.items || []),
    ...(curatedPayload.unresolved || []),
  ].some((savedEntry) => buildSelectionKey(savedEntry) === selectionKey);
}

function buildSelectionKey(entry) {
  return `${entry?.feedUrl || ""}::${entry?.guid || ""}`;
}

function mergeCuratedPayload(existingPayload, newPayload) {
  const items = dedupeCuratedEntries([
    ...(existingPayload.items || []),
    ...(newPayload.items || []),
  ]);
  const unresolved = dedupeCuratedEntries([
    ...(existingPayload.unresolved || []),
    ...(newPayload.unresolved || []),
  ]).filter((entry) => !items.some((item) => buildSelectionKey(item) === buildSelectionKey(entry)));

  return {
    items,
    unresolved,
    summary: {
      requested: items.length + unresolved.length,
      resolved: items.length,
      unresolved: unresolved.length,
      extraFeedsParsed:
        Number(existingPayload.summary?.extraFeedsParsed || 0) +
        Number(newPayload.summary?.extraFeedsParsed || 0),
      extraFeedFailures:
        Number(existingPayload.summary?.extraFeedFailures || 0) +
        Number(newPayload.summary?.extraFeedFailures || 0),
    },
  };
}

function dedupeCuratedEntries(entries) {
  const seenKeys = new Set();
  const dedupedEntries = [];

  for (const entry of entries) {
    const selectionKey = buildSelectionKey(entry);
    if (!selectionKey || seenKeys.has(selectionKey)) {
      continue;
    }

    seenKeys.add(selectionKey);
    dedupedEntries.push(entry);
  }

  return dedupedEntries;
}

async function readExistingCuratedPayload(paths) {
  try {
    return await readJson(paths.curatedNormalized);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return emptyCuratedPayload();
    }

    throw error;
  }
}

function emptyCuratedPayload() {
  return {
    items: [],
    unresolved: [],
    summary: {
      requested: 0,
      resolved: 0,
      unresolved: 0,
      extraFeedsParsed: 0,
      extraFeedFailures: 0,
    },
  };
}
