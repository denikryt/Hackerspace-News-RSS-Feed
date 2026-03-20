import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";

import { DIST_DIR, PATHS } from "./config.js";
import { GLOBAL_FEED_PAGE_SIZE } from "./pagination.js";
import { renderAboutPage } from "./renderers/renderAboutPage.js";
import { renderGlobalFeed } from "./renderers/renderGlobalFeed.js";
import { renderSpaceDetail } from "./renderers/renderSpaceDetail.js";
import { renderSpacesIndex } from "./renderers/renderSpacesIndex.js";
import { readJson, writeText } from "./storage.js";
import { slugify } from "./utils/slugify.js";
import { filterNormalizedPayloadForDisplay } from "./visibleData.js";
import { buildGlobalFeedModel } from "./viewModels/globalFeed.js";
import { buildSpaceDetailModel } from "./viewModels/spaceDetail.js";
import { buildSpacesIndexModel } from "./viewModels/spacesIndex.js";

const FAVICON_SOURCE_PATH = resolve(process.cwd(), "content/favicon.png");

export async function renderSite({
  paths = PATHS,
  distDir = DIST_DIR,
  sourceRowsPayload,
  validationsPayload,
  normalizedPayload,
  now = Date.now(),
  writePages = false,
} = {}) {
  const data = await loadRenderInputs({
    paths,
    sourceRowsPayload,
    validationsPayload,
    normalizedPayload,
  });

  const displayPayload = filterNormalizedPayloadForDisplay(data.normalizedPayload, { now });
  const spacesIndexModel = buildSpacesIndexModel(displayPayload);
  const spaceSlugs = [
    ...new Set(
      [
        ...displayPayload.feeds.map((feed) => slugify(feed.spaceName)),
        ...displayPayload.failures.map((failure) => slugify(failure.hackerspaceName)),
      ].filter(Boolean),
    ),
  ];

  const pages = {
    "index.html": renderSpacesIndex(spacesIndexModel),
    "about/index.html": renderAboutPage({ sourcePageUrl: data.sourceRowsPayload.sourcePageUrl }),
  };

  const totalGlobalFeedItems = displayPayload.feeds.reduce(
    (count, feed) => count + feed.items.length,
    0,
  );
  const totalGlobalFeedPages = Math.max(1, Math.ceil(totalGlobalFeedItems / GLOBAL_FEED_PAGE_SIZE));

  for (let currentPage = 1; currentPage <= totalGlobalFeedPages; currentPage += 1) {
    const globalFeedModel = buildGlobalFeedModel(displayPayload, { currentPage });
    const relativePath = currentPage === 1 ? "feed/index.html" : `feed/page/${currentPage}/index.html`;
    pages[relativePath] = renderGlobalFeed(globalFeedModel);
  }

  for (const spaceSlug of spaceSlugs) {
    const detailModel = buildSpaceDetailModel(displayPayload, spaceSlug);
    const totalPages = detailModel.totalPages || 1;

    for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
      const pagedModel = buildSpaceDetailModel(displayPayload, spaceSlug, { currentPage });
      const relativePath =
        currentPage === 1
          ? `spaces/${spaceSlug}.html`
          : `spaces/${spaceSlug}/page/${currentPage}/index.html`;
      pages[relativePath] = renderSpaceDetail(pagedModel);
    }
  }

  if (writePages) {
    await Promise.all(
      [
        ...Object.entries(pages).map(([relativePath, html]) =>
          writeText(resolve(distDir, relativePath), html),
        ),
        copyFile(FAVICON_SOURCE_PATH, resolve(distDir, "favicon.png")),
      ],
    );
  }

  return {
    sourceRowsPayload: data.sourceRowsPayload,
    validationsPayload: data.validationsPayload,
    normalizedPayload: data.normalizedPayload,
    pages,
  };
}

async function loadRenderInputs({ paths, sourceRowsPayload, validationsPayload, normalizedPayload }) {
  if (sourceRowsPayload && validationsPayload && normalizedPayload) {
    return {
      sourceRowsPayload,
      validationsPayload,
      normalizedPayload,
    };
  }

  const [loadedSourceRowsPayload, loadedValidationsPayload, loadedNormalizedPayload] = await Promise.all([
    sourceRowsPayload ?? readJson(paths.sourceRows),
    validationsPayload ?? readJson(paths.validations),
    normalizedPayload ?? readJson(paths.normalizedFeeds),
  ]);

  return {
    sourceRowsPayload: loadedSourceRowsPayload,
    validationsPayload: loadedValidationsPayload,
    normalizedPayload: loadedNormalizedPayload,
  };
}
