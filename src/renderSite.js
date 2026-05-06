import { copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { injectCanonicalHref, pagePathToCanonicalUrl } from "./canonical.js";
import { DIST_DIR, PATHS, SITE_URL } from "./config.js";
import { listStaticRenderAssets } from "./renderAssets.js";
import {
  buildAuthorPageEntries,
  buildNewspaperFeedPageEntries,
  buildRootStaticPageEntries,
  buildSpacePageEntries,
} from "./renderSitePageBuilders.js";
import { renderGlobalFeed } from "./renderers/renderGlobalFeed.js";
import { readJson, writeText } from "./storage.js";
import { validateNormalizedRenderPayloadForDisplay } from "./renderInputValidation.js";
import { buildRobotsTxt, buildSitemapXml } from "./sitemap.js";
import { slugify } from "./utils/slugify.js";
import { filterNormalizedPayloadForDisplay } from "./visibleData.js";
import { buildCuratedIndexModel } from "./viewModels/curated.js";
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
  curatedPayload,
  now = Date.now(),
  writePages = false,
  logger = null,
} = {}) {
  const data = await loadRenderInputs({
    paths,
    sourceRowsPayload,
    validationsPayload,
    normalizedPayload,
    curatedPayload,
  });

  const context = buildRenderContext(data, { now, logger });
  const nowDate = now instanceof Date ? now : new Date(now);
  const today = nowDate.toISOString().slice(0, 10);

  const pageEntries = [
    ...buildRootStaticPageEntries(context),
    ...buildCuratedPageEntries(context),
    ...buildNewspaperFeedPageEntries(data.normalizedPayload, { today, now: nowDate }, { logger }),
    ...buildAuthorPageEntries(context, { logger }),
    ...buildSpacePageEntries(context, { logger }),
  ];
  const pages = addCanonicalUrlsToRenderedPages(Object.fromEntries(pageEntries), SITE_URL);

  pages["sitemap.xml"] = buildSitemapXml(Object.keys(pages), SITE_URL);
  pages["robots.txt"] = buildRobotsTxt(SITE_URL);

  if (writePages) {
    logInfo(logger, `[render] writing pages: count=${Object.keys(pages).length}`);
    await writeRenderOutput({ distDir, pages });
  }

  logInfo(logger, `[render] render complete: pages=${Object.keys(pages).length}`);

  return {
    sourceRowsPayload: data.sourceRowsPayload,
    validationsPayload: data.validationsPayload,
    normalizedPayload: data.normalizedPayload,
    curatedPayload: data.curatedPayload,
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

// Curated is optional, so the render graph adds the page only when there are visible items.
function buildCuratedPageEntries(context) {
  if ((context.displayPayload.curated?.items || []).length === 0) {
    return [];
  }

  return [
    [
      "curated/index.html",
      renderGlobalFeed(buildCuratedIndexModel(context.displayPayload)),
    ],
  ];
}

async function loadRenderInputs({
  paths,
  sourceRowsPayload,
  validationsPayload,
  normalizedPayload,
  curatedPayload,
}) {
  if (sourceRowsPayload && validationsPayload && normalizedPayload) {
    return {
      sourceRowsPayload,
      validationsPayload,
      normalizedPayload: validateNormalizedRenderPayloadForDisplay(
        mergeCuratedPayload(normalizedPayload, curatedPayload),
      ),
      curatedPayload,
    };
  }

  const [loadedSourceRowsPayload, loadedValidationsPayload, loadedNormalizedPayload, loadedCuratedPayload] = await Promise.all([
    sourceRowsPayload ?? readJson(paths.sourceRows),
    validationsPayload ?? readJson(paths.validations),
    normalizedPayload ?? readJson(paths.normalizedFeeds),
    curatedPayload ?? readOptionalCuratedPayload(paths),
  ]);

  const validatedNormalizedPayload = validateNormalizedRenderPayloadForDisplay(
    mergeCuratedPayload(loadedNormalizedPayload, loadedCuratedPayload),
  );

  return {
    sourceRowsPayload: loadedSourceRowsPayload,
    validationsPayload: loadedValidationsPayload,
    normalizedPayload: validatedNormalizedPayload,
    curatedPayload: loadedCuratedPayload,
  };
}

/**
 * Render keeps the existing view-model contract by reattaching the dedicated
 * curated snapshot before visible-data filtering and page model building.
 */
function mergeCuratedPayload(normalizedPayload, curatedPayload) {
  return {
    ...normalizedPayload,
    curated: curatedPayload ?? normalizedPayload.curated,
  };
}

/**
 * Older checkouts may not have a dedicated curated artifact yet, so render
 * tolerates the file being absent and falls back to inline snapshot data.
 */
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

// The render pipeline owns the output paths, so canonical link insertion lives
// here rather than being duplicated across individual page renderers.
function addCanonicalUrlsToRenderedPages(pages, siteUrl) {
  return Object.fromEntries(
    Object.entries(pages).map(([relativePath, content]) => {
      const canonicalHref = pagePathToCanonicalUrl(relativePath, siteUrl);
      return [relativePath, injectCanonicalHref(content, canonicalHref)];
    }),
  );
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
