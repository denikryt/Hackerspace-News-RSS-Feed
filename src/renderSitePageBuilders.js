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
import { renderNewspaperFeedPageTsx } from "./renderers/tsxPageRuntime.js";
import { buildAuthorDetailModel } from "./viewModels/authors.js";
import {
  buildCountryFeedModel,
  listCountryFeedOptions,
} from "./viewModels/countryFeeds.js";
import { buildFeedSectionModel } from "./viewModels/feedSections.js";
import { buildSpaceDetailModel } from "./viewModels/spaceDetail.js";
import {
  buildAvailableDatesByCountry,
  buildAvailableDatesFromPayload,
  buildNewspaperDayModel,
  encodeCountryForPath,
} from "./viewModels/newspaperFeed.js";

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
// excludePrimarySection: when true, skips the primary feed section (used in newspaper mode
// where primary feed country pages are replaced by per-day newspaper pages).
export function buildCountryFeedPageEntries(context, { logger, excludePrimarySection = false } = {}) {
  const sections = excludePrimarySection
    ? context.feedSections.filter((s) => s.id !== FEED_CONTENT_STREAM_ID)
    : context.feedSections;

  const streamCountryFeeds = sections.flatMap((stream) =>
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
    if (shouldLogLoopCheckpoint(currentAuthor, context.authorsIndexModel.authors.length)) {
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

    entries.push(
      ...buildPaginatedEntityEntries({
        renderPage(currentPage) {
          const pagedModel = buildAuthorDetailModel(context.displayPayload, author.slug, {
            currentPage,
            authorDirectory: context.authorDirectory,
          });
          return [
            getAuthorDetailOutputPath(author.slug, currentPage),
            renderAuthorDetail(pagedModel),
            pagedModel.totalPages,
          ];
        },
      }),
    );
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
    if (shouldLogLoopCheckpoint(currentSpace, context.spaceSlugs.length)) {
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

    entries.push(
      ...buildPaginatedEntityEntries({
        // enrichedItems is undefined on page 1; the model builds it and returns it as
        // _enrichedItems so subsequent pages can skip rebuilding display content.
        renderPage(currentPage, enrichedItems) {
          const pagedModel = buildSpaceDetailModel(context.displayPayload, spaceSlug, {
            currentPage,
            authorDirectory: context.authorDirectory,
            enrichedItems,
          });
          return [
            currentPage === 1
              ? `spaces/${spaceSlug}.html`
              : `spaces/${spaceSlug}/page/${currentPage}/index.html`,
            renderSpaceDetail(pagedModel),
            pagedModel.totalPages,
            pagedModel._enrichedItems,
          ];
        },
      }),
    );
  }

  logInfo(logger, "[render] rendered space pages");
  return entries;
}

export function buildNewspaperFeedPageEntries(normalizedPayload, context, { logger } = {}) {
  const today = context.today || new Date().toISOString().slice(0, 10);
  const now = context.now || new Date();

  const availableDates = buildAvailableDatesFromPayload(normalizedPayload, today);
  const availableDatesByCountry = buildAvailableDatesByCountry(normalizedPayload, today);

  const navItems = [
    { href: "/index.html", label: "Hackerspaces", isCurrent: false },
    { href: "/feed/index.html", label: "News", isCurrent: true },
    { href: "/authors/index.html", label: "Authors", isCurrent: false },
  ];

  if (availableDates.length === 0) {
    logInfo(logger, "[render] newspaper feed: no dates with items found");
    return [["feed/index.html", '<meta http-equiv="refresh" content="0;url=./">']];
  }

  const allItems = (normalizedPayload.feeds || []).flatMap((feed) =>
    (feed.items || []).map((item) => ({
      title: item.title,
      link: item.link,
      displayDate: item.displayDate,
      resolvedAuthor: item.resolvedAuthor,
      summaryText: item.summaryText,
      normalizedCategories: item.normalizedCategories,
      attachments: item.attachments,
      spaceName: feed.spaceName,
      country: feed.country,
    })),
  );

  // Group items by date once — avoids O(dates × items) repeated filtering.
  const itemsByDate = new Map();
  for (const item of allItems) {
    const date = item.displayDate?.slice(0, 10);
    if (!date) continue;
    if (!itemsByDate.has(date)) itemsByDate.set(date, []);
    itemsByDate.get(date).push(item);
  }

  logInfo(logger, `[render] newspaper feed: dates=${availableDates.length}`);
  const entries = [];
  let lastProgressAt = Date.now();

  for (const [dateIndex, date] of availableDates.entries()) {
    const currentDate = dateIndex + 1;
    if (shouldLogLoopCheckpoint(currentDate, availableDates.length)) {
      const progressLog = formatLoopProgressLog({
        label: "newspaper feed",
        currentIndex: currentDate,
        totalItems: availableDates.length,
        lastCheckpointAt: lastProgressAt,
        checkpointAt: Date.now(),
      });
      logInfo(logger, progressLog.message);
      lastProgressAt = progressLog.checkpointAt;
    }

    const dayItems = itemsByDate.get(date) || [];

    // All-countries page
    const dayModel = buildNewspaperDayModel(dayItems, date, now, null, availableDates, availableDatesByCountry, { navItems });
    entries.push([`feed/${date}/index.html`, renderNewspaperFeedPageTsx(dayModel)]);

    // Per-country pages — only for countries that have items on this date
    const countriesOnDay = [...new Set(dayItems.map((i) => i.country).filter(Boolean))].sort();
    for (const country of countriesOnDay) {
      const countryItems = dayItems.filter((i) => i.country === country);
      const countryModel = buildNewspaperDayModel(countryItems, date, now, country, availableDates, availableDatesByCountry, { navItems });
      entries.push([`feed/${date}/${encodeCountryForPath(country)}/index.html`, renderNewspaperFeedPageTsx(countryModel)]);
    }
  }

  // Shared date index — loaded by newspaper-nav.js to populate date <select> on the client.
  // Avoids embedding 4000+ <option> elements in every HTML page.
  const byCountry = {};
  for (const [country, dates] of availableDatesByCountry) {
    byCountry[country] = dates;
  }
  entries.push(["feed/dates.json", JSON.stringify({ dates: availableDates, byCountry })]);

  // Redirect from /feed/index.html to most recent date
  const latestDate = availableDates[0];
  entries.push([
    "feed/index.html",
    `<!doctype html><html><head><meta http-equiv="refresh" content="0;url=${latestDate}/" /><title>Redirecting…</title></head><body></body></html>`,
  ]);

  logInfo(logger, `[render] newspaper feed: rendered ${entries.length} pages`);
  return entries;
}

function logInfo(logger, message) {
  if (typeof logger === "function") {
    logger(message);
  }
}

function shouldLogLoopCheckpoint(currentIndex, totalItems) {
  return currentIndex === 1 || currentIndex === totalItems || currentIndex % 100 === 0;
}

// Author and space detail builders share the same paginated render shape.
// renderPage returns a [path, html, totalPages, cache] tuple. Page 1 is rendered first
// to discover totalPages without a separate model build, then remaining pages follow.
// The optional cache element lets callers thread pre-built data (e.g. enriched items)
// through subsequent pages so expensive per-item work is not repeated.
function buildPaginatedEntityEntries({ renderPage }) {
  const [firstPath, firstHtml, totalPages, cache] = renderPage(1, undefined);
  const entries = [[firstPath, firstHtml]];

  for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
    const [path, html] = renderPage(currentPage, cache);
    entries.push([path, html]);
  }

  return entries;
}
