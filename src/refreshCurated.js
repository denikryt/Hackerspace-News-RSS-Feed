import { PATHS } from "./config.js";
import { collectCuratedSnapshot } from "./curatedSnapshot.js";
import { writeJson } from "./storage.js";

/**
 * Curated-only refresh updates just the dedicated curated snapshot. It leaves
 * the main feed snapshots untouched so the command stays narrow and cheap.
 */
export async function refreshCurated({
  paths = PATHS,
  fetchImpl = fetch,
  writeSnapshot = false,
  logger = null,
  readCuratedPublicationsImpl,
  processCuratedSourceRowsImpl,
} = {}) {
  const result = await collectCuratedSnapshot({
    paths,
    fetchImpl,
    logger,
    readCuratedPublicationsImpl,
    processCuratedSourceRowsImpl,
  });

  if (writeSnapshot) {
    await writeJson(paths.curatedNormalized, result.curatedPayload);
  }

  return {
    ...result,
    outputPath: paths.curatedNormalized,
  };
}
