import { getAuthorDetailOutputPath } from "./authors.js";
import { getCountryFeedOutputPath } from "./countryFeeds.js";
import { FEED_CONTENT_STREAM_ID, getFeedSectionOutputPath } from "./feedSections.js";
import { GLOBAL_FEED_PAGE_SIZE } from "./pagination.js";
import { formatLoopProgressLog, formatPrimaryStreamProgressLog } from "./renderProgress.js";
import { renderAboutPage } from "./renderers/renderAboutPage.js";
import { renderAuthorDetail } from "./renderers/renderAuthorDetail.js";
import { renderAuthorsIndex } from "./renderers/renderAuthorsIndex.js";
import { renderGlobalFeed } from "./renderers/renderGlobalFeed.js";
import { renderSpaceDetail } from "./renderers/renderSpaceDetail.js";
import { renderSpacesIndex } from "./renderers/renderSpacesIndex.js";
import { buildAuthorDetailModel } from "./viewModels/authors.js";
import {
  buildCountryFeedModel,
  listCountryFeedOptions,
} from "./viewModels/countryFeeds.js";
import { buildFeedSectionModel } from "./viewModels/feedSections.js";
import { buildSpaceDetailModel } from "./viewModels/spaceDetail.js";

// Root pages do not depend on pagination loops, so keep them as a small stable builder.
export function buildRootStaticPageEntries(context) {
  return [
    ["index.html", renderSpacesIndex(context.spacesIndexModel)],
    ["about/index.html", renderAboutPage()],
  ];
}

// The primary section keeps its own progress logs because it is the main feed stream.
export function buildPrimaryFeedSectionPageEntries(context, { logger } = {}) {
  const primarySection = context.feedSections.find((section) => section.id === FEED_CONTENT_STREAM_ID);

  if (!primarySection) {
    return [];
  }

  const totalPages = Math.max(1, Math.ceil(primarySection.totalItems / GLOBAL_FEED_PAGE_SIZE));
  logInfo(logger, `[render] rendering primary feed section: pages=${totalPages}`);
  const entries = [];
  let lastProgressAt = Date.now();

  for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
    if (currentPage === 1 || currentPage === totalPages || currentPage % 100 === 0) {
      const progressLog = formatPrimaryStreamProgressLog({
        currentPage,
        totalPages,
        lastCheckpointAt: lastProgressAt,
        checkpointAt: Date.now(),
      });
      logInfo(
        logger,
        progressLog.message.replace(
          "[render] primary stream progress",
          "[render] primary feed section progress",
        ),
      );
      lastProgressAt = progressLog.checkpointAt;
    }

    const streamModel = buildFeedSectionModel(context.displayPayload, {
      sectionId: primarySection.id,
      currentPage,
      context: context.feedSectionContext,
    });
    entries.push([
      getFeedSectionOutputPath(primarySection.id, currentPage),
      renderGlobalFeed({
        ...streamModel,
        countryOptions: listCountryFeedOptions(context.displayPayload, primarySection.id, null, {
          context: context.countryFeedContext,
        }),
      }),
    ]);
  }

  logInfo(logger, "[render] rendered primary feed section");
  return entries;
}

// Country pages are grouped by section first so output order stays deterministic.
export function buildCountryFeedPageEntries(context, { logger } = {}) {
  const streamCountryFeeds = context.feedSections.flatMap((stream) =>
    context.listCountryFeedsForSection(stream.id).map((countryFeed) => ({
      ...countryFeed,
      sectionId: stream.id,
    })),
  );

  logInfo(logger, `[render] rendering country feeds: count=${streamCountryFeeds.length}`);
  const entries = [];
  let lastProgressAt = Date.now();

  for (const [countryIndex, countryFeed] of streamCountryFeeds.entries()) {
    const currentCountry = countryIndex + 1;
    if (
      currentCountry === 1 ||
      currentCountry === streamCountryFeeds.length ||
      currentCountry % 100 === 0
    ) {
      const progressLog = formatLoopProgressLog({
        label: "country feeds",
        currentIndex: currentCountry,
        totalItems: streamCountryFeeds.length,
        lastCheckpointAt: lastProgressAt,
        checkpointAt: Date.now(),
      });
      logInfo(logger, progressLog.message);
      lastProgressAt = progressLog.checkpointAt;
    }

    const streamCountryItems = context.countryFeedContext.itemsBySectionIdByCountry.get(countryFeed.sectionId);
    const countryItems = streamCountryItems?.get(countryFeed.country) || [];
    const totalPages = Math.max(1, Math.ceil(countryItems.length / GLOBAL_FEED_PAGE_SIZE));

    for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
      const countryModel = buildCountryFeedModel(
        context.displayPayload,
        countryFeed.sectionId,
        countryFeed.slug,
        {
          currentPage,
          context: context.countryFeedContext,
        },
      );
      entries.push([
        getCountryFeedOutputPath(countryFeed.sectionId, countryFeed.country, currentPage),
        renderGlobalFeed(countryModel),
      ]);
    }
  }

  logInfo(logger, "[render] rendered country feeds");
  return entries;
}

// Secondary sections reuse the same feed renderer but must keep their own progress labels.
export function buildSecondaryFeedSectionPageEntries(context, { logger } = {}) {
  const secondarySections = context.feedSections.filter((section) => section.id !== FEED_CONTENT_STREAM_ID);
  logInfo(logger, `[render] rendering secondary feed sections: count=${secondarySections.length}`);
  const entries = [];

  for (const section of secondarySections) {
    const totalPages = Math.max(1, Math.ceil(section.totalItems / GLOBAL_FEED_PAGE_SIZE));
    logInfo(logger, `[render] secondary feed section ${section.id}: pages=${totalPages}`);
    let lastProgressAt = Date.now();

    for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
      if (currentPage === 1 || currentPage === totalPages || currentPage % 100 === 0) {
        const progressLog = formatPrimaryStreamProgressLog({
          currentPage,
          totalPages,
          lastCheckpointAt: lastProgressAt,
          checkpointAt: Date.now(),
        });
        logInfo(
          logger,
          progressLog.message.replace(
            "[render] primary stream progress",
            `[render] secondary feed section ${section.id} progress`,
          ),
        );
        lastProgressAt = progressLog.checkpointAt;
      }

      const streamModel = buildFeedSectionModel(context.displayPayload, {
        sectionId: section.id,
        currentPage,
        context: context.feedSectionContext,
      });
      entries.push([
        getFeedSectionOutputPath(section.id, currentPage),
        renderGlobalFeed({
          ...streamModel,
          countryOptions: listCountryFeedOptions(context.displayPayload, section.id, null, {
            context: context.countryFeedContext,
          }),
        }),
      ]);
    }
  }

  logInfo(logger, "[render] rendered secondary feed sections");
  return entries;
}

// Author detail pages depend on the shared author directory, so keep that dependency explicit.
export function buildAuthorPageEntries(context, { logger } = {}) {
  logInfo(logger, `[render] rendering author pages: authors=${context.authorsIndexModel.authors.length}`);
  const entries = [["authors/index.html", renderAuthorsIndex(context.authorsIndexModel)]];
  let lastProgressAt = Date.now();

  for (const [authorIndex, author] of context.authorsIndexModel.authors.entries()) {
    const currentAuthor = authorIndex + 1;
    if (
      currentAuthor === 1 ||
      currentAuthor === context.authorsIndexModel.authors.length ||
      currentAuthor % 100 === 0
    ) {
      const progressLog = formatLoopProgressLog({
        label: "author pages",
        currentIndex: currentAuthor,
        totalItems: context.authorsIndexModel.authors.length,
        lastCheckpointAt: lastProgressAt,
        checkpointAt: Date.now(),
      });
      logInfo(logger, progressLog.message);
      lastProgressAt = progressLog.checkpointAt;
    }

    const detailModel = buildAuthorDetailModel(context.displayPayload, author.slug, {
      authorDirectory: context.authorDirectory,
    });
    const totalPages = detailModel.totalPages || 1;

    for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
      const pagedModel = buildAuthorDetailModel(context.displayPayload, author.slug, {
        currentPage,
        authorDirectory: context.authorDirectory,
      });
      entries.push([
        getAuthorDetailOutputPath(author.slug, currentPage),
        renderAuthorDetail(pagedModel),
      ]);
    }
  }

  logInfo(logger, "[render] rendered author pages");
  return entries;
}

// Space detail pages derive page count from the current display payload and author directory.
export function buildSpacePageEntries(context, { logger } = {}) {
  logInfo(logger, `[render] rendering space pages: spaces=${context.spaceSlugs.length}`);
  const entries = [];
  let lastProgressAt = Date.now();

  for (const [spaceIndex, spaceSlug] of context.spaceSlugs.entries()) {
    const currentSpace = spaceIndex + 1;
    if (
      currentSpace === 1 ||
      currentSpace === context.spaceSlugs.length ||
      currentSpace % 100 === 0
    ) {
      const progressLog = formatLoopProgressLog({
        label: "space pages",
        currentIndex: currentSpace,
        totalItems: context.spaceSlugs.length,
        lastCheckpointAt: lastProgressAt,
        checkpointAt: Date.now(),
      });
      logInfo(logger, progressLog.message);
      lastProgressAt = progressLog.checkpointAt;
    }

    const detailModel = buildSpaceDetailModel(context.displayPayload, spaceSlug, {
      authorDirectory: context.authorDirectory,
    });
    const totalPages = detailModel.totalPages || 1;

    for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
      const pagedModel = buildSpaceDetailModel(context.displayPayload, spaceSlug, {
        currentPage,
        authorDirectory: context.authorDirectory,
      });
      entries.push([
        currentPage === 1
          ? `spaces/${spaceSlug}.html`
          : `spaces/${spaceSlug}/page/${currentPage}/index.html`,
        renderSpaceDetail(pagedModel),
      ]);
    }
  }

  logInfo(logger, "[render] rendered space pages");
  return entries;
}

function logInfo(logger, message) {
  if (typeof logger === "function") {
    logger(message);
  }
}
