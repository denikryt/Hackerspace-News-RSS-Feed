import { consumePageEntries } from "./renderPageSink.js";
import { withStagedDirectory } from "./stagedDirectory.js";
import { RESOURCE_LIMITS } from "./resourceLimits.js";
import { createMemoryDiagnostics } from "./memoryDiagnostics.js";
import { normalizeCalendarSnapshot } from "./calendar/normalizeCalendarSnapshot.js";
import { isCalendarIndexValid } from "./calendar/buildCalendarIndex.js";
import { limitFeedPayload, limitItemText } from "./truncateContentText.js";
import { copyFile, mkdir, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { buildCalendarIndex } from "./calendar/index.js";
import { DIST_DIR, PATHS, SITE_URL } from "./config.js";
import { listStaticRenderAssets } from "./renderAssets.js";
import { buildAuthorPageEntries, buildCalendarPageEntries, buildNewspaperFeedPageEntries, buildRootStaticPageEntries, buildSpacePageEntries, } from "./renderSitePageBuilders.js";
import { renderGlobalFeed } from "./renderers/renderGlobalFeed.js";
import { readJson, writeText } from "./storage.js";
import { validateNormalizedRenderPayloadForDisplay } from "./renderInputValidation.js";
import { slugify } from "./utils/slugify.js";
import { filterNormalizedPayloadForDisplay } from "./visibleData.js";
import { buildCuratedIndexModel } from "./viewModels/curated.js";
import { buildAuthorDirectory, buildAuthorsIndexModel, } from "./viewModels/authors.js";
import { buildSpacesIndexModel } from "./viewModels/spacesIndex.js";
export async function renderSite({ paths = PATHS, distDir = DIST_DIR, sourceRowsPayload, validationsPayload, normalizedPayload, curatedPayload, calendarPayload, calendarIndexPayload, now = Date.now(), writePages = false, logger = null, writeTextImpl = writeText, copyFileImpl = copyFile, } = {}) {
    const data = await loadRenderInputs({
        now, paths,
        sourceRowsPayload,
        validationsPayload,
        normalizedPayload,
        curatedPayload,
        calendarPayload,
        calendarIndexPayload,
    });
    const context = buildRenderContext(data, { now, logger });
    const nowDate = now instanceof Date ? now : new Date(now);
    const today = nowDate.toISOString().slice(0, 10);
    // The producer is suspended at each yield until the sink finishes its write.
    function* pageEntries() {
        yield* buildRootStaticPageEntries(context);
        yield* buildCuratedPageEntries(context);
        yield* buildCalendarPageEntries({ calendarPayload: data.calendarPayload, calendarIndexPayload: data.calendarIndexPayload, now: nowDate }, { logger });
        yield* buildNewspaperFeedPageEntries(data.normalizedPayload, { today, now: nowDate }, { logger });
        yield* buildAuthorPageEntries(context, { logger });
        yield* buildSpacePageEntries(context, { logger });
    }
    if (writePages) {
        const memory = createMemoryDiagnostics({ logger: logger || console.log });
        let pagesWritten = 0;
        logInfo(logger, '[render] writing pages sequentially');
        const result = await withStagedDirectory(resolve(distDir), async (stage) => {
            const summary = await consumePageEntries(pageEntries(), { siteUrl: SITE_URL, write: async (path, html) => {
                    await writeTextImpl(resolve(stage, path), html);
                    pagesWritten++;
                    if (pagesWritten % 100 === 0)
                        memory('render:pages', { pagesWritten });
                } });
            for (const asset of listStaticRenderAssets()) {
                if ((await stat(asset.sourcePath)).size > RESOURCE_LIMITS.artifactMaxBytes)
                    throw Object.assign(new Error('render_artifact_too_large'), { code: 'render_artifact_too_large' });
                await mkdir(dirname(resolve(stage, asset.outputPath)), { recursive: true });
                await copyFileImpl(asset.sourcePath, resolve(stage, asset.outputPath));
            }
            return summary;
        });
        memory('render:complete', { pagesWritten });
        logInfo(logger, `[render] render complete: pages=${result.pageCount}`);
        return { pageCount: result.pageCount, outputDir: distDir };
    }
    const result = await consumePageEntries(pageEntries(), { siteUrl: SITE_URL });
    logInfo(logger, `[render] render complete: pages=${result.pageCount}`);
    return { ...data, ...result };
}
// Shared render data is built once so page builders stay pure and reuse the same inputs.
function buildRenderContext(data, { now, logger }) {
    const displayPayload = filterNormalizedPayloadForDisplay(data.normalizedPayload, { now });
    logInfo(logger, `[render] loaded inputs: feeds=${displayPayload.feeds.length} failures=${displayPayload.failures.length}`);
    const spacesIndexModel = buildSpacesIndexModel(displayPayload);
    logInfo(logger, "[render] built spaces index model");
    const spaceSlugs = [
        ...new Set([
            ...displayPayload.feeds.map((feed) => slugify(feed.spaceName)),
            ...displayPayload.failures.map((failure) => slugify(failure.hackerspaceName)),
        ].filter(Boolean)),
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
async function loadRawRenderInputs({ paths, sourceRowsPayload, validationsPayload, normalizedPayload, curatedPayload, calendarPayload, calendarIndexPayload, }) {
    if (sourceRowsPayload && validationsPayload && normalizedPayload && calendarPayload) {
        return {
            sourceRowsPayload,
            validationsPayload,
            normalizedPayload: mergeCuratedPayload(normalizedPayload, curatedPayload),
            curatedPayload,
            calendarPayload,
            calendarIndexPayload,
        };
    }
    const [loadedSourceRowsPayload, loadedValidationsPayload, loadedNormalizedPayload, loadedCuratedPayload, loadedCalendarPayload,] = await Promise.all([
        sourceRowsPayload ?? readJson(paths.sourceRows),
        validationsPayload ?? readJson(paths.validations),
        normalizedPayload ?? readJson(paths.normalizedFeeds),
        curatedPayload ?? readOptionalCuratedPayload(paths),
        calendarPayload ?? readCalendarPayload(paths.calendarEvents),
    ]);
    const loadedCalendarIndexPayload = calendarIndexPayload
        ?? await readCalendarIndexPayload(paths.calendarIndex);
    const validatedNormalizedPayload = mergeCuratedPayload(loadedNormalizedPayload, loadedCuratedPayload);
    return {
        sourceRowsPayload: loadedSourceRowsPayload,
        validationsPayload: loadedValidationsPayload,
        normalizedPayload: validatedNormalizedPayload,
        curatedPayload: loadedCuratedPayload,
        calendarPayload: loadedCalendarPayload,
        calendarIndexPayload: loadedCalendarIndexPayload,
    };
}
// Calendar data is an optional snapshot. Render keeps working when refresh has
// not produced it yet, but still publishes a stable empty JSON artifact.
async function readCalendarPayload(filePath) {
    if (!filePath) {
        return buildEmptyCalendarPayload();
    }
    try {
        return await readJson(filePath);
    }
    catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
            return buildEmptyCalendarPayload();
        }
        throw error;
    }
}
// Missing derived indices are rebuilt only after canonical event normalization.
async function readCalendarIndexPayload(filePath) {
    if (!filePath)
        return null;
    try {
        return await readJson(filePath);
    }
    catch (error) {
        if (error?.code === 'ENOENT')
            return null;
        throw error;
    }
}
function buildEmptyCalendarPayload() {
    return {
        generatedAt: null,
        items: [],
        events: [],
        summary: {
            sources: 0,
            parsedSources: 0,
            parsedEvents: 0,
            failedSources: 0,
        },
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
    }
    catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
            return undefined;
        }
        throw error;
    }
}
// The render pipeline owns the output paths, so canonical link insertion lives
// here rather than being duplicated across individual page renderers.
function logInfo(logger, message) {
    if (typeof logger === "function") {
        logger(message);
    }
}
// Publication boundary is identical for disk snapshots and injected payloads.
// Normalize before Zod cloning, indexing, view models or JSON serialization.
async function loadRenderInputs(options) {
    const data = await loadRawRenderInputs(options);
    const calendarPayload = normalizeCalendarSnapshot(data.calendarPayload);
    const normalizedPayload = limitFeedPayload(data.normalizedPayload);
    const curated = data.curatedPayload ?? normalizedPayload.curated;
    const curatedPayload = curated ? { ...curated, items: (curated.items || []).map(item => limitItemText(item)) } : curated;
    normalizedPayload.curated = curatedPayload;
    const indexOptions = { timeZone: 'UTC', windowYear: new Date(options.now).getUTCFullYear(), generatedAt: calendarPayload.generatedAt };
    const calendarIndexPayload = isCalendarIndexValid(data.calendarIndexPayload, calendarPayload.events, indexOptions) ? data.calendarIndexPayload : buildCalendarIndex(calendarPayload.events, indexOptions);
    return { ...data, normalizedPayload: validateNormalizedRenderPayloadForDisplay(normalizedPayload), curatedPayload, calendarPayload, calendarIndexPayload };
}
