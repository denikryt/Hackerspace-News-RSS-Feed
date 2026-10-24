import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { refreshDataset } from "../../../src/refreshDataset.js";
import { createTextResponse } from "../../_shared/http.js";
import { readFixtureText } from "../../_shared/paths.js";
import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDir } from "../../_shared/tempDirs.js";

const tempDirs = createTempDirTracker();
const sourcePageUrl = "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds";
const sourceHtml = readFixtureText("source-page", "user-jomat-oldid-94788-snippet.html");
// Keep the saved registry shape grounded in the project's real snapshot.
const saved = JSON.parse(readFixtureText("source-page", "saved-source-urls.json"));
const savedRow = saved.urls.find(row => row.hackerspaceName === "BetaMachine");
afterEach(() => cleanupTrackedTempDirs(tempDirs));

async function setup() {
  const dir = await createTrackedTempDir("hnf-wiki-fallback-", tempDirs);
  const paths = Object.fromEntries([
    "sourceRows", "validations", "normalizedFeeds", "curatedNormalized", "curatedPublications",
    "calendarSources", "calendarEvents", "calendarIndex",
  ].map(key => [key, resolve(dir, `${key}.json`)]));
  paths.calendarRawDirectory = resolve(dir, "raw");
  const registry = { ...saved, urls: [savedRow] };
  await writeFile(paths.sourceRows, JSON.stringify(registry));
  const calendar = { items: [{ url: "https://hsbxl.be/events/index.ics", hs_name: "Hackerspace Brussels", country: "Belgium" }] };
  await writeFile(paths.calendarSources, JSON.stringify(calendar));
  const fetchImpl = vi.fn(async url => {
    if (url === sourcePageUrl) return createTextResponse({ url, status: 503, body: "unavailable" });
    if (url === calendar.items[0].url) return createTextResponse({ url, contentType: "text/calendar", body: "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n" });
    return createTextResponse({ url, contentType: "application/rss+xml", body: '<rss version="2.0"><channel><title>Fresh feed</title><link>https://www.betamachine.fr</link><description>News</description><item><title>Fresh post</title><guid>fresh</guid></item></channel></rss>' });
  });
  return { paths, fetchImpl, registry, calendar, logger: vi.fn() };
}

describe("refresh with an unavailable wiki", () => {
  it.each(["HTTP error", "network error", "invalid HTML", "empty table"])("refreshes saved RSS and ICS URLs after %s", async failure => {
    const ctx = await setup();
    if (failure === "network error") ctx.fetchImpl.mockImplementationOnce(async () => { throw new Error("fetch failed"); });
    if (failure === "invalid HTML") ctx.fetchImpl.mockImplementationOnce(async url => createTextResponse({ url, body: "<html>maintenance</html>" }));
    if (failure === "empty table") ctx.fetchImpl.mockImplementationOnce(async url => createTextResponse({ url, body: sourceHtml.replace(/data-row-number=/g, "data-removed-row-number=") }));
    const originalCalendar = await readFile(ctx.paths.calendarSources, "utf8");
    const result = await refreshDataset({ ...ctx, sourcePageUrl, writeSnapshots: true });
    expect(result.sourceRowsPayload.urls).toEqual(ctx.registry.urls);
    expect(result.sourceRowsPayload.extractedAt).toBe(ctx.registry.extractedAt);
    expect(result.normalizedPayload.feeds[0].items[0].title).toBe("Fresh post");
    expect(result.calendarPayload.summary.parsedSources).toBe(1);
    expect(await readFile(ctx.paths.calendarSources, "utf8")).toBe(originalCalendar);
    expect(ctx.fetchImpl.mock.calls.filter(([url]) => url === sourcePageUrl)).toHaveLength(1);
    expect(ctx.logger.mock.calls.some(([line]) => line.includes("saved source registry"))).toBe(true);
    expect(JSON.parse(await readFile(ctx.paths.normalizedFeeds, "utf8")).feeds).toHaveLength(1);
  });

  it("uses the live wiki instead of an obsolete saved list when available", async () => {
    const ctx = await setup();
    ctx.fetchImpl.mockImplementationOnce(async url => createTextResponse({ url, body: sourceHtml }));
    const result = await refreshDataset({ ...ctx, sourcePageUrl });
    expect(result.sourceRowsPayload.urls).toHaveLength(3);
  });

  it.each([null, "{broken", '{"urls":[]}', '{"urls":[{}]}'])("fails clearly without a usable saved RSS registry: %s", async content => {
    const ctx = await setup();
    if (content === null) {
      const { unlink } = await import("node:fs/promises");
      await unlink(ctx.paths.sourceRows);
    } else await writeFile(ctx.paths.sourceRows, content);
    await expect(refreshDataset({ ...ctx, sourcePageUrl, writeSnapshots: true })).rejects.toThrow(/saved source registry/);
    expect(JSON.parse(await readFile(ctx.paths.calendarSources, "utf8"))).toEqual(ctx.calendar);
    expect(ctx.fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("refreshes only saved calendars without requiring an RSS registry", async () => {
    const ctx = await setup();
    ctx.paths.sourceRows = resolve(ctx.paths.calendarRawDirectory, "missing.json");
    const result = await refreshDataset({ ...ctx, sourcePageUrl, refreshCalendarOnly: true, writeSnapshots: true });
    expect(result.calendarPayload.summary.parsedSources).toBe(1);
    expect(ctx.fetchImpl).toHaveBeenCalledTimes(2);
  });
});
