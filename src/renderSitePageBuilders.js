import { checkPageTextBudget } from "./renderPageSink.js";
import { publicCalendarPayload } from "./calendar/normalizeCalendarSnapshot.js";
import { getAuthorDetailOutputPath } from "./authors.js";
import { buildCalendarPageModelFromIndex } from "./calendar/index.js";
import { formatLoopProgressLog } from "./renderProgress.js";
import { renderAboutPage } from "./renderers/renderAboutPage.js";
import { renderAuthorDetail } from "./renderers/renderAuthorDetail.js";
import { renderAuthorsIndex } from "./renderers/renderAuthorsIndex.js";
import { renderCalendarPage } from "./renderers/renderCalendarPage.js";
import { renderSpaceDetail } from "./renderers/renderSpaceDetail.js";
import { renderSpacesIndex } from "./renderers/renderSpacesIndex.js";
import { renderNewspaperFeedPageTsx } from "./renderers/tsxPageRuntime.js";
import { buildPrimaryNavItems } from "./siteNav.js";
import { buildAuthorDetailModel } from "./viewModels/authors.js";
import { buildSpaceDetailModel } from "./viewModels/spaceDetail.js";
import { buildAvailableDatesByCountry, buildAvailableDatesFromPayload, buildNewspaperDayModel, encodeCountryForPath, } from "./viewModels/newspaperFeed.js";
export function* buildRootStaticPageEntries(context) {
    yield ["index.html", renderSpacesIndex(context.spacesIndexModel)];
    yield ["about/index.html", renderAboutPage()];
}
export function* buildCalendarPageEntries(context, { logger } = {}) {
    const calendarPayload = context.calendarPayload || { events: [] };
    const calendarIndexPayload = context.calendarIndexPayload || { availableMonthsWithEvents: [], months: {} };
    const events = Array.isArray(calendarPayload.events) ? calendarPayload.events : [];
    const now = context.now || new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const monthKeys = calendarIndexPayload.availableMonthsWithEvents || [];
    const monthEntries = buildCalendarMonthEntries({
        calendarPayload, calendarIndexPayload,
        currentMonth,
        monthKeys,
        now,
    });
    logInfo(logger, `[render] calendar page: events=${events.length} months=${monthKeys.length}`);
    yield ["calendar/index.html", `<!doctype html><html><head><meta http-equiv="refresh" content="0;url=${currentMonth}/" /><title>Redirecting…</title></head><body></body></html>`];
    yield* monthEntries;
    yield ["calendar/events.json", JSON.stringify(publicCalendarPayload(calendarPayload, { windowYear: calendarIndexPayload.windowYear, windowStart: calendarIndexPayload.windowStart, windowEndExclusive: calendarIndexPayload.windowEndExclusive }), null, 2)];
}
export function* buildAuthorPageEntries(context, { logger } = {}) {
    logInfo(logger, `[render] rendering author pages: authors=${context.authorsIndexModel.authors.length}`);
    yield ["authors/index.html", renderAuthorsIndex(context.authorsIndexModel)];
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
        yield* buildPaginatedEntityEntries({
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
        });
    }
    logInfo(logger, "[render] rendered author pages");
}
export function* buildSpacePageEntries(context, { logger } = {}) {
    logInfo(logger, `[render] rendering space pages: spaces=${context.spaceSlugs.length}`);
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
        yield* buildPaginatedEntityEntries({
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
        });
    }
    logInfo(logger, "[render] rendered space pages");
}
export function* buildNewspaperFeedPageEntries(normalizedPayload, context, { logger } = {}) {
    const today = context.today || new Date().toISOString().slice(0, 10);
    const now = context.now || new Date();
    const availableDates = buildAvailableDatesFromPayload(normalizedPayload, today);
    const availableDatesByCountry = buildAvailableDatesByCountry(normalizedPayload, today);
    const navItems = buildPrimaryNavItems("News");
    if (availableDates.length === 0) {
        logInfo(logger, "[render] newspaper feed: no dates with items found");
        yield ["news/dates.json", "[]"];
        yield ["news/index.html", '<meta http-equiv="refresh" content="0;url=./">'];
        return;
    }
    const allItems = (normalizedPayload.feeds || []).flatMap((feed) => (feed.items || []).map((item) => ({
        title: item.title,
        link: item.link,
        displayDate: item.displayDate,
        resolvedAuthor: item.resolvedAuthor,
        contentHtml: item.contentHtml,
        contentText: item.contentText,
        summaryHtml: item.summaryHtml,
        summaryText: item.summaryText,
        normalizedCategories: item.normalizedCategories,
        categoriesRaw: item.categoriesRaw,
        attachments: item.attachments,
        spaceName: feed.spaceName,
        country: feed.country,
    })));
    const itemsByDate = new Map();
    for (const item of allItems) {
        const date = item.displayDate?.slice(0, 10);
        if (!date)
            continue;
        if (!itemsByDate.has(date))
            itemsByDate.set(date, []);
        itemsByDate.get(date).push(item);
    }
    logInfo(logger, `[render] newspaper feed: dates=${availableDates.length}`);
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
        checkPageTextBudget(dayItems);
        const dayModel = buildNewspaperDayModel(dayItems, date, now, null, availableDates, availableDatesByCountry, { navItems });
        yield [`news/${date}/index.html`, renderNewspaperFeedPageTsx(dayModel)];
        const countriesOnDay = [...new Set(dayItems.map((i) => i.country).filter(Boolean))].sort();
        for (const country of countriesOnDay) {
            const countryItems = dayItems.filter((i) => i.country === country);
            const countryModel = buildNewspaperDayModel(countryItems, date, now, country, availableDates, availableDatesByCountry, { navItems });
            yield [`news/${date}/${encodeCountryForPath(country)}/index.html`, renderNewspaperFeedPageTsx(countryModel)];
        }
    }
    const byCountry = {};
    for (const [country, dates] of availableDatesByCountry) {
        byCountry[country] = dates;
    }
    yield ["news/dates.json", JSON.stringify({ dates: availableDates, byCountry })];
    const latestDate = availableDates[0];
    yield [
        "news/index.html",
        `<!doctype html><html><head><meta http-equiv="refresh" content="0;url=${latestDate}/" /><title>Redirecting…</title></head><body></body></html>`,
    ];
    logInfo(logger, "[render] newspaper feed: rendered pages");
}
function logInfo(logger, message) {
    if (typeof logger === "function") {
        logger(message);
    }
}
function* buildCalendarMonthEntries({ calendarPayload, calendarIndexPayload, currentMonth, monthKeys, now }) {
    const orderedMonthKeys = [...new Set([currentMonth, ...monthKeys])];
    for (const monthKey of orderedMonthKeys) {
        const model = buildCalendarPageModelFromIndex(calendarIndexPayload, {
            events: calendarPayload.events,
            timeZone: "UTC",
            selectedMonth: monthKey,
            now,
        });
        yield [
            `calendar/${monthKey}/index.html`,
            renderCalendarPage(withCalendarNavigation(model)),
        ];
    }
}
function withCalendarNavigation(model) {
    return {
        ...model,
        navItems: buildPrimaryNavItems("Calendar"),
        previousMonthHref: model.previousMonth ? getCalendarMonthHref(model.previousMonth) : null,
        nextMonthHref: model.nextMonth ? getCalendarMonthHref(model.nextMonth) : null,
    };
}
function getCalendarMonthHref(monthKey) {
    return `/calendar/${monthKey}/`;
}
function shouldLogLoopCheckpoint(currentIndex, totalItems) {
    return currentIndex === 1 || currentIndex === totalItems || currentIndex % 100 === 0;
}
// Keep enriched entity input between pages, never earlier HTML strings.
function* buildPaginatedEntityEntries({ renderPage }) {
    let cache;
    let totalPages = 1;
    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
        const [path, html, count, nextCache] = renderPage(currentPage, cache);
        totalPages = count;
        cache = nextCache;
        yield [path, html];
    }
}
