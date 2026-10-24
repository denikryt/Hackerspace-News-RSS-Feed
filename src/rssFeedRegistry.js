import { PATHS } from "./config.js";
import { mergeValidSourceEntries } from "./discoveryValidSourceList.js";
import { readJson, writeJson } from "./storage.js";

// Public RSS entries identify a space and its feed. Wiki links are optional;
// discovery provenance belongs in the audit artifact, not in this registry.
export function validateRssFeedRegistry(payload) {
  if (!Array.isArray(payload?.items)) {
    throw new Error("Invalid RSS registry: expected an items array");
  }
  for (const [index, entry] of payload.items.entries()) {
    for (const key of ["hackerspaceName", "country", "website", "feedUrl"]) {
      if (typeof entry?.[key] !== "string" || !entry[key].trim()) {
        throw new Error(`Invalid RSS registry: item ${index + 1} needs ${key}`);
      }
    }
  }
  return payload.items;
}

// Translate public names once so generated wiki snapshots and feed IDs keep
// their existing pipeline contracts.
export async function loadRssSourceRows({
  includeDiscoveryValid = false,
  readJsonImpl = readJson,
  paths = PATHS,
} = {}) {
  if (!includeDiscoveryValid) return [];
  const items = validateRssFeedRegistry(await readJsonImpl(paths.rssFeeds));
  return items.map(toPipelineSourceRow);
}

// Keep the mapping separate from file loading so the public/internal boundary
// is visible without following refresh or feed normalization code.
function toPipelineSourceRow({ feedUrl, website, ...metadata }) {
  return { ...metadata, candidateFeedUrl: feedUrl, siteUrl: website };
}

// Only a missing registry is empty. Malformed manual data must never be
// replaced with discovery output.
export async function readRssFeedRegistry({ filePath, readJsonImpl = readJson }) {
  try {
    return validateRssFeedRegistry(await readJsonImpl(filePath));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

// Discovery appends to this same public registry. Existing manual entries
// stay authoritative when discovered entries overlap.
export async function updateRssFeedRegistry({
  filePath,
  newItems,
  readJsonImpl = readJson,
  writeJsonImpl = writeJson,
}) {
  const existing = await readRssFeedRegistry({ filePath, readJsonImpl });
  validateRssFeedRegistry({ items: newItems });
  const payload = { items: mergeValidSourceEntries(existing, newItems) };
  await writeJsonImpl(filePath, payload);
  return payload;
}
