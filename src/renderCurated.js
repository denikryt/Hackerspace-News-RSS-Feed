import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { DIST_DIR, PATHS } from "./config.js";
import { renderGlobalFeed } from "./renderers/renderGlobalFeed.js";
import { readJson, writeText } from "./storage.js";
import { filterNormalizedPayloadForDisplay } from "./visibleData.js";
import { buildCuratedIndexModel } from "./viewModels/curated.js";

const FAVICON_SOURCE_PATH = resolve(process.cwd(), "content/favicon.png");

/**
 * Curated-only render reads the local feed snapshots and rewrites only the
 * curated page so other dist artifacts remain untouched.
 */
export async function renderCurated({
  paths = PATHS,
  distDir = DIST_DIR,
  normalizedPayload,
  curatedPayload,
  now = Date.now(),
  writePages = false,
  logger = null,
} = {}) {
  const data = await loadCuratedRenderInputs({ paths, normalizedPayload, curatedPayload });
  const displayPayload = filterNormalizedPayloadForDisplay(data.normalizedPayload, { now });

  logInfo(
    logger,
    `[render] loaded curated inputs: feeds=${displayPayload.feeds.length} curated=${displayPayload.curated?.items?.length || 0}`,
  );

  const pages = {
    "curated/index.html": renderGlobalFeed(buildCuratedIndexModel(displayPayload)),
  };

  if (writePages) {
    logInfo(logger, "[render] writing curated page");
    await mkdir(distDir, { recursive: true });
    await Promise.all([
      writeText(resolve(distDir, "curated/index.html"), pages["curated/index.html"]),
      copyFile(FAVICON_SOURCE_PATH, resolve(distDir, "favicon.png")),
    ]);
  }

  logInfo(logger, `[render] curated-only render complete: pages=${Object.keys(pages).length}`);

  return {
    normalizedPayload: data.normalizedPayload,
    curatedPayload: data.curatedPayload,
    outputDir: distDir,
    pages,
  };
}

/**
 * The dedicated curated snapshot is authoritative, but older data snapshots
 * may still carry curated inline, so render keeps a fallback for that shape.
 */
async function loadCuratedRenderInputs({ paths, normalizedPayload, curatedPayload }) {
  if (normalizedPayload) {
    return {
      normalizedPayload: mergeCuratedPayload(normalizedPayload, curatedPayload),
      curatedPayload,
    };
  }

  const loadedNormalizedPayload = await readJson(paths.normalizedFeeds);
  const loadedCuratedPayload = curatedPayload ?? await readOptionalCuratedPayload(paths);

  return {
    normalizedPayload: mergeCuratedPayload(loadedNormalizedPayload, loadedCuratedPayload),
    curatedPayload: loadedCuratedPayload,
  };
}

function mergeCuratedPayload(normalizedPayload, curatedPayload) {
  return {
    ...normalizedPayload,
    curated: curatedPayload ?? normalizedPayload.curated ?? emptyCuratedPayload(),
  };
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

async function readOptionalCuratedPayload(paths) {
  if (!paths?.curatedNormalized) {
    return undefined;
  }

  try {
    return await readJson(paths.curatedNormalized);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

function logInfo(logger, message) {
  if (typeof logger === "function") {
    logger(message);
  }
}
