import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { renderSite } from "../src/renderSite.js";

const tempDirs = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("renderSite", () => {
  it("renders dist pages from local json only and produces reproducible output", async () => {
    const rootDir = await mkdtemp(resolve(tmpdir(), "hnf-render-"));
    tempDirs.push(rootDir);

    const dataDir = resolve(rootDir, "data");
    const distDir = resolve(rootDir, "dist");
    const paths = {
      sourceRows: resolve(dataDir, "source_urls.json"),
      validations: resolve(dataDir, "feed_validation.json"),
      normalizedFeeds: resolve(dataDir, "feeds_normalized.json"),
    };

    const sourceRowsPayload = {
      sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
      sectionTitle: "Spaces with RSS feeds",
      extractedAt: "2026-03-19T20:00:00.000Z",
      urls: [],
    };

    const validationsPayload = [
      {
        rowNumber: 2,
        candidateUrl: "https://www.betamachine.fr/feed/",
        finalUrl: "https://www.betamachine.fr/feed/",
        fetchOk: true,
        isParsable: true,
        detectedFormat: "rss",
      },
    ];

    const normalizedPayload = {
      generatedAt: "2026-03-19T20:00:00.000Z",
      sourcePageUrl: sourceRowsPayload.sourcePageUrl,
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
    };

    await mkdir(resolve(distDir, "all"), { recursive: true });

    await Promise.all([
      writeJson(paths.sourceRows, sourceRowsPayload),
      writeJson(paths.validations, validationsPayload),
      writeJson(paths.normalizedFeeds, normalizedPayload),
    ]);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(() => {
      throw new Error("renderSite must not access the network");
    });

    try {
      const firstRun = await renderSite({ paths, distDir, now: Date.parse("2026-03-19T12:00:00.000Z"), writePages: true });
      const secondRun = await renderSite({ paths, distDir, now: Date.parse("2026-03-19T12:00:00.000Z"), writePages: true });

      expect(Object.keys(firstRun.pages)).toEqual([
        "index.html",
        "about/index.html",
        "feed/index.html",
        "authors/index.html",
        "authors/alice.html",
        "other/index.html",
        "spaces/betamachine.html",
      ]);
      expect(secondRun.pages).toEqual(firstRun.pages);

      const [indexHtml, aboutHtml, feedHtml, authorsHtml, detailHtml] = await Promise.all([
        readFile(resolve(distDir, "index.html"), "utf8"),
        readFile(resolve(distDir, "about/index.html"), "utf8"),
        readFile(resolve(distDir, "feed/index.html"), "utf8"),
        readFile(resolve(distDir, "authors/index.html"), "utf8"),
        readFile(resolve(distDir, "spaces/betamachine.html"), "utf8"),
      ]);
      await access(resolve(distDir, "favicon.png"));

      expect(indexHtml).toContain("Hackerspace News");
      expect(indexHtml).toContain('<link rel="icon" href="/favicon.png" type="image/png" />');
      expect(aboutHtml).toContain("About");
      expect(aboutHtml).toContain('<link rel="icon" href="/favicon.png" type="image/png" />');
      expect(feedHtml).toContain("Feed");
      expect(feedHtml).toContain('<link rel="icon" href="/favicon.png" type="image/png" />');
      expect(authorsHtml).toContain("Authors");
      expect(detailHtml).toContain("BetaMachine");
      expect(detailHtml).toContain('<link rel="icon" href="/favicon.png" type="image/png" />');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("writes only the current render output into dist without leaving stale artifacts", async () => {
    const rootDir = await mkdtemp(resolve(tmpdir(), "hnf-render-"));
    tempDirs.push(rootDir);

    const dataDir = resolve(rootDir, "data");
    const distDir = resolve(rootDir, "dist");
    const paths = {
      sourceRows: resolve(dataDir, "source_urls.json"),
      validations: resolve(dataDir, "feed_validation.json"),
      normalizedFeeds: resolve(dataDir, "feeds_normalized.json"),
    };

    const sourceRowsPayload = {
      sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
      sectionTitle: "Spaces with RSS feeds",
      extractedAt: "2026-03-19T20:00:00.000Z",
      urls: [],
    };

    const validationsPayload = [];
    const normalizedPayload = {
      generatedAt: "2026-03-19T20:00:00.000Z",
      sourcePageUrl: sourceRowsPayload.sourcePageUrl,
      summary: {
        sourceRows: 0,
        validFeeds: 0,
        parsedFeeds: 0,
        emptyFeeds: 0,
        failedFeeds: 0,
      },
      feeds: [],
      failures: [],
    };

    await Promise.all([
      mkdir(resolve(distDir, "all"), { recursive: true }),
      mkdir(resolve(distDir, "stale/nested"), { recursive: true }),
    ]);

    await Promise.all([
      writeJson(paths.sourceRows, sourceRowsPayload),
      writeJson(paths.validations, validationsPayload),
      writeJson(paths.normalizedFeeds, normalizedPayload),
      writeFile(resolve(distDir, "all/index.html"), "<html>stale</html>", "utf8"),
      writeFile(resolve(distDir, "obsolete.txt"), "stale", "utf8"),
      writeFile(resolve(distDir, "stale/nested/old.html"), "<html>old</html>", "utf8"),
    ]);

    const result = await renderSite({
      paths,
      distDir,
      now: Date.parse("2026-03-19T12:00:00.000Z"),
      writePages: true,
    });

    const actualDistFiles = await listRelativeFiles(distDir);
    expect(actualDistFiles.sort()).toEqual(
      [...Object.keys(result.pages), "favicon.png"].sort(),
    );
  });
});

async function writeJson(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function listRelativeFiles(rootDir, currentDir = rootDir) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const relativePaths = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = resolve(currentDir, entry.name);

      if (entry.isDirectory()) {
        return listRelativeFiles(rootDir, absolutePath);
      }

      return absolutePath.slice(rootDir.length + 1);
    }),
  );

  return relativePaths.flat();
}
