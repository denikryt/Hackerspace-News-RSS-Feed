import { copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { DIST_DIR, PATHS } from "./config.js";
import { FEED_CONTENT_STREAM_ID, getContentStreamOutputPath } from "./contentStreams.js";
import { getCountryFeedOutputPath } from "./countryFeeds.js";
import { GLOBAL_FEED_PAGE_SIZE } from "./pagination.js";
import { getAuthorDetailOutputPath } from "./authors.js";
import { renderAuthorDetail } from "./renderers/renderAuthorDetail.js";
import { renderAuthorsIndex } from "./renderers/renderAuthorsIndex.js";
import { renderAboutPage } from "./renderers/renderAboutPage.js";
import { renderGlobalFeed } from "./renderers/renderGlobalFeed.js";
import { renderSpaceDetail } from "./renderers/renderSpaceDetail.js";
import { renderSpacesIndex } from "./renderers/renderSpacesIndex.js";
import { readJson, writeText } from "./storage.js";
import { formatLoopProgressLog, formatPrimaryStreamProgressLog } from "./renderProgress.js";
import { slugify } from "./utils/slugify.js";
import { filterNormalizedPayloadForDisplay } from "./visibleData.js";
import { buildCuratedIndexModel } from "./viewModels/curated.js";
import {
  buildCountryFeedContext,
  buildCountryFeedModel,
  listCountryFeeds,
} from "./viewModels/countryFeeds.js";
import { buildGlobalFeedModel } from "./viewModels/globalFeed.js";
import {
  buildAuthorDetailModel,
  buildAuthorDirectory,
  buildAuthorsIndexModel,
} from "./viewModels/authors.js";
import {
  buildContentStreamContext,
  buildContentStreamModel,
  listContentStreams,
} from "./viewModels/contentStreams.js";
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
  logger = null,
} = {}) {
  const data = await loadRenderInputs({
    paths,
    sourceRowsPayload,
    validationsPayload,
    normalizedPayload,
  });

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

  const pages = {
    "index.html": renderSpacesIndex(spacesIndexModel),
    "about/index.html": renderAboutPage(),
  };

  if ((displayPayload.curated?.items || []).length > 0) {
    pages["curated/index.html"] = renderGlobalFeed(buildCuratedIndexModel(displayPayload));
  }

  const contentStreamContext = buildContentStreamContext(displayPayload);
  const contentStreams = listContentStreams(displayPayload, { context: contentStreamContext });
  const countryFeedContext = buildCountryFeedContext(displayPayload, { contentStreamContext });
  logInfo(logger, `[render] built content streams: count=${contentStreams.length}`);
  const primaryStream = contentStreams.find((stream) => stream.id === FEED_CONTENT_STREAM_ID);
  const secondaryStreams = contentStreams.filter((stream) => stream.id !== FEED_CONTENT_STREAM_ID);

  if (primaryStream) {
    const totalPages = Math.max(1, Math.ceil(primaryStream.totalItems / GLOBAL_FEED_PAGE_SIZE));
    logInfo(logger, `[render] rendering primary stream: pages=${totalPages}`);
    let lastPrimaryProgressAt = Date.now();

    for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
      if (
        currentPage === 1 ||
        currentPage === totalPages ||
        currentPage % 100 === 0
      ) {
        const progressLog = formatPrimaryStreamProgressLog({
          currentPage,
          totalPages,
          lastCheckpointAt: lastPrimaryProgressAt,
          checkpointAt: Date.now(),
        });
        logInfo(logger, progressLog.message);
        lastPrimaryProgressAt = progressLog.checkpointAt;
      }

      const streamModel = buildGlobalFeedModel(displayPayload, {
        currentPage,
        context: contentStreamContext,
        countryFeedContext,
      });
      pages[getContentStreamOutputPath(primaryStream.id, currentPage)] = renderGlobalFeed(streamModel);
    }

    logInfo(logger, "[render] rendered primary stream");
  }
  const countryFeeds = listCountryFeeds(displayPayload, { context: countryFeedContext });
  logInfo(logger, `[render] rendering country feeds: count=${countryFeeds.length}`);
  let lastCountryProgressAt = Date.now();

  for (const [countryIndex, countryFeed] of countryFeeds.entries()) {
    const currentCountry = countryIndex + 1;
    if (
      currentCountry === 1 ||
      currentCountry === countryFeeds.length ||
      currentCountry % 100 === 0
    ) {
      const progressLog = formatLoopProgressLog({
        label: "country feeds",
        currentIndex: currentCountry,
        totalItems: countryFeeds.length,
        lastCheckpointAt: lastCountryProgressAt,
        checkpointAt: Date.now(),
      });
      logInfo(logger, progressLog.message);
      lastCountryProgressAt = progressLog.checkpointAt;
    }

    const countryItems = countryFeedContext.itemsByCountry.get(countryFeed.country) || [];
    const totalPages = Math.max(1, Math.ceil(countryItems.length / GLOBAL_FEED_PAGE_SIZE));

    for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
      const countryModel = buildCountryFeedModel(displayPayload, countryFeed.slug, {
        currentPage,
        context: countryFeedContext,
      });
      pages[getCountryFeedOutputPath(countryFeed.country, currentPage)] = renderGlobalFeed(countryModel);
    }
  }
  logInfo(logger, "[render] rendered country feeds");

  logInfo(logger, "[render] building author directory");
  const authorDirectory = buildAuthorDirectory(displayPayload);
  logInfo(logger, "[render] built author directory");
  const authorsIndexModel = buildAuthorsIndexModel(displayPayload, { authorDirectory });
  logInfo(logger, `[render] built authors index model: authors=${authorsIndexModel.authors.length}`);
  logInfo(
    logger,
    `[render] built page models: spaces=${spaceSlugs.length} authors=${authorsIndexModel.authors.length} streams=${contentStreams.length}`,
  );
  pages["authors/index.html"] = renderAuthorsIndex(authorsIndexModel);

  logInfo(logger, `[render] rendering author pages: authors=${authorsIndexModel.authors.length}`);
  let lastAuthorProgressAt = Date.now();
  for (const [authorIndex, author] of authorsIndexModel.authors.entries()) {
    const currentAuthor = authorIndex + 1;
    if (
      currentAuthor === 1 ||
      currentAuthor === authorsIndexModel.authors.length ||
      currentAuthor % 100 === 0
    ) {
      const progressLog = formatLoopProgressLog({
        label: "author pages",
        currentIndex: currentAuthor,
        totalItems: authorsIndexModel.authors.length,
        lastCheckpointAt: lastAuthorProgressAt,
        checkpointAt: Date.now(),
      });
      logInfo(logger, progressLog.message);
      lastAuthorProgressAt = progressLog.checkpointAt;
    }

    const detailModel = buildAuthorDetailModel(displayPayload, author.slug, { authorDirectory });
    const totalPages = detailModel.totalPages || 1;

    for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
      const pagedModel = buildAuthorDetailModel(displayPayload, author.slug, {
        currentPage,
        authorDirectory,
      });
      pages[getAuthorDetailOutputPath(author.slug, currentPage)] = renderAuthorDetail(pagedModel);
    }
  }
  logInfo(logger, "[render] rendered author pages");

  logInfo(logger, `[render] rendering secondary streams: count=${secondaryStreams.length}`);
  for (const stream of secondaryStreams) {
    const totalPages = Math.max(1, Math.ceil(stream.totalItems / GLOBAL_FEED_PAGE_SIZE));
    logInfo(logger, `[render] secondary stream ${stream.id}: pages=${totalPages}`);
    let lastSecondaryProgressAt = Date.now();

    for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
      if (
        currentPage === 1 ||
        currentPage === totalPages ||
        currentPage % 100 === 0
      ) {
        const progressLog = formatPrimaryStreamProgressLog({
          currentPage,
          totalPages,
          lastCheckpointAt: lastSecondaryProgressAt,
          checkpointAt: Date.now(),
        });
        logInfo(
          logger,
          progressLog.message.replace(
            "[render] primary stream progress",
            `[render] secondary stream ${stream.id} progress`,
          ),
        );
        lastSecondaryProgressAt = progressLog.checkpointAt;
      }

      const streamModel = buildContentStreamModel(displayPayload, {
        streamId: stream.id,
        currentPage,
        context: contentStreamContext,
      });
      pages[getContentStreamOutputPath(stream.id, currentPage)] = renderGlobalFeed(streamModel);
    }
  }
  logInfo(logger, "[render] rendered secondary streams");

  logInfo(logger, `[render] rendering space pages: spaces=${spaceSlugs.length}`);
  let lastSpaceProgressAt = Date.now();
  for (const [spaceIndex, spaceSlug] of spaceSlugs.entries()) {
    const currentSpace = spaceIndex + 1;
    if (
      currentSpace === 1 ||
      currentSpace === spaceSlugs.length ||
      currentSpace % 100 === 0
    ) {
      const progressLog = formatLoopProgressLog({
        label: "space pages",
        currentIndex: currentSpace,
        totalItems: spaceSlugs.length,
        lastCheckpointAt: lastSpaceProgressAt,
        checkpointAt: Date.now(),
      });
      logInfo(logger, progressLog.message);
      lastSpaceProgressAt = progressLog.checkpointAt;
    }

    const detailModel = buildSpaceDetailModel(displayPayload, spaceSlug, { authorDirectory });
    const totalPages = detailModel.totalPages || 1;

    for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
      const pagedModel = buildSpaceDetailModel(displayPayload, spaceSlug, {
        currentPage,
        authorDirectory,
      });
      const relativePath =
        currentPage === 1
          ? `spaces/${spaceSlug}.html`
          : `spaces/${spaceSlug}/page/${currentPage}/index.html`;
      pages[relativePath] = renderSpaceDetail(pagedModel);
    }
  }
  logInfo(logger, "[render] rendered space pages");

  if (writePages) {
    logInfo(logger, `[render] writing pages: count=${Object.keys(pages).length}`);
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

  logInfo(logger, `[render] render complete: pages=${Object.keys(pages).length}`);

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

function logInfo(logger, message) {
  if (typeof logger === "function") {
    logger(message);
  }
}
