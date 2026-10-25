import { readFile, unlink, writeFile } from "node:fs/promises";
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
    "calendarSources", "calendarSourcesSnapshot", "calendarEvents", "calendarIndex",
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
  it("boots an empty data volume from the bundled RSS registry", async () => {
    const ctx = await setup();
    await unlink(ctx.paths.sourceRows);
    ctx.paths.rssFeeds = resolve(ctx.paths.calendarRawDirectory, "../rss_feeds.json");
    await writeFile(ctx.paths.rssFeeds, JSON.stringify({ items: [{
      hackerspaceName: "BetaMachine",
      country: "France",
      website: "https://www.betamachine.fr",
      feedUrl: "https://www.betamachine.fr/feed/",
    }] }));

    const result = await refreshDataset({ ...ctx, sourcePageUrl, writeSnapshots: true });

    expect(result.sourceRowsPayload.urls).toEqual([expect.objectContaining({
      hackerspaceName: "BetaMachine",
      candidateFeedUrl: "https://www.betamachine.fr/feed/",
      rowNumber: 1,
    })]);
    expect(result.normalizedPayload.feeds[0].items[0].title).toBe("Fresh post");
    expect(JSON.parse(await readFile(ctx.paths.sourceRows, "utf8")).urls).toHaveLength(1);
    expect(ctx.logger.mock.calls.some(([line]) => line.includes("bundled RSS registry"))).toBe(true);
  });
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

  it("keeps manually added feeds without wiki links and ignores duplicate feed URLs", async () => {
    const ctx = await setup();
    const manual = (name, url) => ({ hackerspaceName: name, country: "France", siteUrl: url, candidateFeedUrl: `${url}/feed` });
    const result = await refreshDataset({ ...ctx, sourcePageUrl, additionalSourceRows: [
      manual("One", "https://manual-one.example"),
      manual("Two", "https://manual-two.example"),
      { ...ctx.registry.urls[0], hackerspaceWikiUrl: undefined },
    ] });
    expect(result.sourceRowsPayload.urls.map(row => row.candidateFeedUrl)).toEqual([
      ctx.registry.urls[0].candidateFeedUrl,
      "https://manual-one.example/feed", "https://manual-two.example/feed",
    ]);
    expect(new Set(result.sourceRowsPayload.urls.map(row => row.rowNumber)).size).toBe(3);
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

  it("retains discovered calendar sources from the data snapshot when wiki is unavailable", async () => {
    const ctx = await setup();
    const discovered = { url: "https://calendar.saved.example/events.ics", hs_name: "Saved Space", country: "Germany" };
    await writeFile(ctx.paths.calendarSourcesSnapshot, JSON.stringify({ items: [discovered] }));
    const originalFetch = ctx.fetchImpl;
    ctx.fetchImpl = vi.fn(async url => url === discovered.url
      ? createTextResponse({ url, contentType: "text/calendar", body: "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n" })
      : originalFetch(url));

    const result = await refreshDataset({ ...ctx, sourcePageUrl, writeSnapshots: true });

    expect(result.calendarSourcesPayload.items).toEqual([...ctx.calendar.items, discovered]);
    expect(result.calendarPayload.summary.parsedSources).toBe(2);
    expect(await readFile(ctx.paths.calendarSources, "utf8")).toBe(JSON.stringify(ctx.calendar));
  });
});
