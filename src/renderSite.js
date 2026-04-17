import { copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { DIST_DIR, PATHS } from "./config.js";
import { listStaticRenderAssets } from "./renderAssets.js";
import {
  buildAuthorPageEntries,
  buildNewspaperFeedPageEntries,
  buildRootStaticPageEntries,
  buildSpacePageEntries,
} from "./renderSitePageBuilders.js";
import { readJson, writeText } from "./storage.js";
import { validateNormalizedRenderPayloadForDisplay } from "./renderInputValidation.js";
import { slugify } from "./utils/slugify.js";
import { filterNormalizedPayloadForDisplay } from "./visibleData.js";
import {
  buildAuthorDirectory,
  buildAuthorsIndexModel,
} from "./viewModels/authors.js";
import { buildSpacesIndexModel } from "./viewModels/spacesIndex.js";

export async function renderSite({
  paths = PATHS,
  distDir = DIST_DIR,
  sourceRowsPayload,
  validationsPayload,
  normalizedPayload,
  now = Date.now(),
  writePages = false,
  logger = null,
} = {}) {
  const data = await loadRenderInputs({
    paths,
    sourceRowsPayload,
    validationsPayload,
    normalizedPayload,
  });

  const context = buildRenderContext(data, { now, logger });
  const nowDate = now instanceof Date ? now : new Date(now);
  const today = nowDate.toISOString().slice(0, 10);

  const pageEntries = [
    ...buildRootStaticPageEntries(context),
    ...buildNewspaperFeedPageEntries(data.normalizedPayload, { today, now: nowDate }, { logger }),
    ...buildAuthorPageEntries(context, { logger }),
    ...buildSpacePageEntries(context, { logger }),
  ];
  const pages = Object.fromEntries(pageEntries);

  if (writePages) {
    logInfo(logger, `[render] writing pages: count=${Object.keys(pages).length}`);
    await writeRenderOutput({ distDir, pages });
  }

  logInfo(logger, `[render] render complete: pages=${Object.keys(pages).length}`);

  return {
    sourceRowsPayload: data.sourceRowsPayload,
    validationsPayload: data.validationsPayload,
    normalizedPayload: data.normalizedPayload,
    pages,
  };
}

// Shared render data is built once so page builders stay pure and reuse the same inputs.
function buildRenderContext(data, { now, logger }) {
  const displayPayload = filterNormalizedPayloadForDisplay(data.normalizedPayload, { now });
  logInfo(logger, `[render] loaded inputs: feeds=${displayPayload.feeds.length} failures=${displayPayload.failures.length}`);

  const spacesIndexModel = buildSpacesIndexModel(displayPayload);
  logInfo(logger, "[render] built spaces index model");

  const spaceSlugs = [
    ...new Set(
      [
        ...displayPayload.feeds.map((feed) => slugify(feed.spaceName)),
        ...displayPayload.failures.map((failure) => slugify(failure.hackerspaceName)),
      ].filter(Boolean),
    ),
  ];

  logInfo(logger, "[render] building author directory");
  const authorDirectory = buildAuthorDirectory(displayPayload);
  logInfo(logger, "[render] built author directory");
  const authorsIndexModel = buildAuthorsIndexModel(displayPayload, { authorDirectory });
  logInfo(logger, `[render] built authors index model: authors=${authorsIndexModel.authors.length}`);
  logInfo(logger, `[render] built page models: spaces=${spaceSlugs.length} authors=${authorsIndexModel.authors.length}`);

  return {
    displayPayload,
    spacesIndexModel,
    spaceSlugs,
    authorDirectory,
    authorsIndexModel,
  };
}

async function loadRenderInputs({ paths, sourceRowsPayload, validationsPayload, normalizedPayload }) {
  if (sourceRowsPayload && validationsPayload && normalizedPayload) {
    return {
      sourceRowsPayload,
      validationsPayload,
      normalizedPayload: validateNormalizedRenderPayloadForDisplay(normalizedPayload),
    };
  }

  const [loadedSourceRowsPayload, loadedValidationsPayload, loadedNormalizedPayload] = await Promise.all([
    sourceRowsPayload ?? readJson(paths.sourceRows),
    validationsPayload ?? readJson(paths.validations),
    normalizedPayload ?? readJson(paths.normalizedFeeds),
  ]);

  const validatedNormalizedPayload = validateNormalizedRenderPayloadForDisplay(loadedNormalizedPayload);

  return {
    sourceRowsPayload: loadedSourceRowsPayload,
    validationsPayload: loadedValidationsPayload,
    normalizedPayload: validatedNormalizedPayload,
  };
}

async function writeRenderOutput({ distDir, pages }) {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  const assets = listStaticRenderAssets();
  // Pre-create subdirectories for assets that live in subdirectories of dist/.
  const assetDirs = [...new Set(assets.map((a) => resolve(distDir, a.outputPath).replace(/\/[^/]+$/, "")))];
  await Promise.all(assetDirs.map((dir) => mkdir(dir, { recursive: true })));
  await Promise.all([
    ...Object.entries(pages).map(([relativePath, html]) =>
      writeText(resolve(distDir, relativePath), html),
    ),
    ...assets.map((asset) =>
      copyFile(asset.sourcePath, resolve(distDir, asset.outputPath)),
    ),
  ]);
}

function logInfo(logger, message) {
  if (typeof logger === "function") {
    logger(message);
  }
}
