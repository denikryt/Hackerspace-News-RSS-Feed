import { copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { DIST_DIR, PATHS } from "./config.js";
import { GLOBAL_FEED_PAGE_SIZE } from "./pagination.js";
import { getAuthorDetailOutputPath } from "./authors.js";
import { getContentStreamOutputPath } from "./contentStreams.js";
import { renderAuthorDetail } from "./renderers/renderAuthorDetail.js";
import { renderAuthorsIndex } from "./renderers/renderAuthorsIndex.js";
import { renderAboutPage } from "./renderers/renderAboutPage.js";
import { renderGlobalFeed } from "./renderers/renderGlobalFeed.js";
import { renderSpaceDetail } from "./renderers/renderSpaceDetail.js";
import { renderSpacesIndex } from "./renderers/renderSpacesIndex.js";
import { readJson, writeText } from "./storage.js";
import { slugify } from "./utils/slugify.js";
import { filterNormalizedPayloadForDisplay } from "./visibleData.js";
import { buildAuthorDetailModel, buildAuthorsIndexModel } from "./viewModels/authors.js";
import { buildContentStreamModel, listContentStreams } from "./viewModels/contentStreams.js";
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
    "about/index.html": renderAboutPage(),
  };

  const contentStreams = listContentStreams(displayPayload);
  const primaryStream = contentStreams.find((stream) => stream.id === "all");
  const secondaryStreams = contentStreams.filter((stream) => stream.id !== "all");

  if (primaryStream) {
    const totalPages = Math.max(1, Math.ceil(primaryStream.totalItems / GLOBAL_FEED_PAGE_SIZE));

    for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
      const streamModel = buildContentStreamModel(displayPayload, {
        streamId: primaryStream.id,
        currentPage,
      });
      pages[getContentStreamOutputPath(primaryStream.id, currentPage)] = renderGlobalFeed(streamModel);
    }
  }

  const authorsIndexModel = buildAuthorsIndexModel(displayPayload);
  pages["authors/index.html"] = renderAuthorsIndex(authorsIndexModel);

  for (const author of authorsIndexModel.authors) {
    const detailModel = buildAuthorDetailModel(displayPayload, author.slug);
    const totalPages = detailModel.totalPages || 1;

    for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
      const pagedModel = buildAuthorDetailModel(displayPayload, author.slug, { currentPage });
      pages[getAuthorDetailOutputPath(author.slug, currentPage)] = renderAuthorDetail(pagedModel);
    }
  }

  for (const stream of secondaryStreams) {
    const totalPages = Math.max(1, Math.ceil(stream.totalItems / GLOBAL_FEED_PAGE_SIZE));

    for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
      const streamModel = buildContentStreamModel(displayPayload, {
        streamId: stream.id,
        currentPage,
      });
      pages[getContentStreamOutputPath(stream.id, currentPage)] = renderGlobalFeed(streamModel);
    }
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
    await rm(distDir, { recursive: true, force: true });
    await mkdir(distDir, { recursive: true });
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
