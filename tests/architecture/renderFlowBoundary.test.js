import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createTempDirTracker, createTrackedTempDir, cleanupTrackedTempDirs } from "../_shared/tempDirs.js";

import { renderSite } from "../../src/renderSite.js";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
});

describe("render flow boundary", () => {
  it("renders from local JSON inputs without accessing the network", async () => {
    const rootDir = await createTrackedTempDir("hnf-render-boundary-", tempDirs);

    const dataDir = resolve(rootDir, "data");
    const distDir = resolve(rootDir, "dist");
    const paths = {
      sourceRows: resolve(dataDir, "source_urls.json"),
      validations: resolve(dataDir, "feed_validation.json"),
      normalizedFeeds: resolve(dataDir, "feeds_normalized.json"),
    };

    await mkdir(resolve(distDir, "feed"), { recursive: true });
    await Promise.all([
      writeJson(paths.sourceRows, {
        sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
        sectionTitle: "Spaces with RSS feeds",
        extractedAt: "2026-03-19T20:00:00.000Z",
        urls: [],
      }),
      writeJson(paths.validations, []),
      writeJson(paths.normalizedFeeds, {
        generatedAt: "2026-03-19T20:00:00.000Z",
        sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
        summary: {
          sourceRows: 1,
          validFeeds: 1,
          parsedFeeds: 1,
          emptyFeeds: 0,
          failedFeeds: 0,
        },
        feeds: [
          {
            id: "row-2-betamachine",
            rowNumber: 2,
            sourceWikiUrl: "https://wiki.hackerspaces.org/BetaMachine",
            finalFeedUrl: "https://www.betamachine.fr/feed/",
            siteUrl: "https://www.betamachine.fr",
            spaceName: "BetaMachine",
            country: "France",
            feedType: "rss",
            status: "parsed_ok",
            items: [
              {
                id: "b-1",
                title: "Newest post",
                link: "https://www.betamachine.fr/newest",
                resolvedAuthor: "Alice",
                authorSource: "author",
                publishedAt: "2025-01-02T10:00:00.000Z",
                summary: "Newest summary",
              },
            ],
          },
        ],
        failures: [],
      }),
    ]);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(() => {
      throw new Error("renderSite must not access the network");
    });

    try {
      const result = await renderSite({
        paths,
        distDir,
        now: Date.parse("2026-03-19T12:00:00.000Z"),
        writePages: true,
      });

      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(Object.keys(result.pages)).toEqual(expect.arrayContaining([
        "index.html",
        "about/index.html",
        "feed/index.html",
      ]));
      expect(await readFile(resolve(distDir, "index.html"), "utf8")).toContain("Hackerspace News");
      await access(resolve(distDir, "favicon.png"));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

async function writeJson(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
