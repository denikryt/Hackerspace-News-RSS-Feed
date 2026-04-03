import { PATHS } from "./config.js";
import { readJson } from "./storage.js";

/**
 * Refresh, build, and analyze all opt into the same clean discovery-valid
 * artifact. Keeping the loader here avoids each CLI re-implementing the same
 * path handling and payload shape checks.
 */
export async function loadDiscoveryValidSourceRows({
  includeDiscoveryValid = false,
  readJsonImpl = readJson,
  paths = PATHS,
} = {}) {
  if (!includeDiscoveryValid) {
    return [];
  }

  const payload = await readJsonImpl(paths.discoveredValidSourceRows);
  return Array.isArray(payload?.urls) ? payload.urls : [];
}
