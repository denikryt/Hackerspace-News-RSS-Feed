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
  it("renders the about page through a static renderer contract without passing source data props", async () => {
    vi.resetModules();

    const renderAboutPage = vi.fn(() => "<html>about</html>");
    vi.doMock("../src/renderers/renderAboutPage.js", () => ({
      renderAboutPage,
    }));

    const { renderSite: isolatedRenderSite } = await import("../src/renderSite.js");

    await isolatedRenderSite({
      sourceRowsPayload: {
        sectionTitle: "Spaces with RSS feeds",
        extractedAt: "2026-03-19T20:00:00.000Z",
        urls: [],
      },
      validationsPayload: [],
      normalizedPayload: {
        generatedAt: "2026-03-19T20:00:00.000Z",
        sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
        summary: {
          sourceRows: 0,
          validFeeds: 0,
          parsedFeeds: 0,
          emptyFeeds: 0,
          failedFeeds: 0,
        },
        feeds: [],
        failures: [],
      },
    });

    expect(renderAboutPage).toHaveBeenCalledWith();

    vi.doUnmock("../src/renderers/renderAboutPage.js");
    vi.resetModules();
  });

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
        sourceRows: 2,
        validFeeds: 2,
        parsedFeeds: 2,
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
        {
          id: "row-3-c3d2",
          rowNumber: 3,
          sourceWikiUrl: "https://wiki.hackerspaces.org/C3D2",
          finalFeedUrl: "https://c3d2.de/news-atom.xml",
          siteUrl: "https://c3d2.de",
          spaceName: "C3D2",
          country: "Germany",
          feedType: "atom",
          status: "parsed_ok",
          items: [
            {
              id: "c3d2-1",
              title: "Workshop notes",
              link: "https://c3d2.de/workshop-notes",
              publishedAt: "2025-01-01T10:00:00.000Z",
              summary: "Workshop summary",
            },
          ],
        },
      ],
      failures: [],
    };

    await mkdir(resolve(distDir, "feed"), { recursive: true });

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
        "feed/countries/france/index.html",
        "feed/countries/germany/index.html",
        "authors/index.html",
        "authors/alice.html",
        "other/index.html",
        "spaces/betamachine.html",
        "spaces/c3d2.html",
      ]);
      expect(secondRun.pages).toEqual(firstRun.pages);

      const [indexHtml, aboutHtml, feedHtml, franceFeedHtml, authorsHtml, detailHtml] = await Promise.all([
        readFile(resolve(distDir, "index.html"), "utf8"),
        readFile(resolve(distDir, "about/index.html"), "utf8"),
        readFile(resolve(distDir, "feed/index.html"), "utf8"),
        readFile(resolve(distDir, "feed/countries/france/index.html"), "utf8"),
        readFile(resolve(distDir, "authors/index.html"), "utf8"),
        readFile(resolve(distDir, "spaces/betamachine.html"), "utf8"),
      ]);
      await access(resolve(distDir, "favicon.png"));

      expect(indexHtml).toContain("Hackerspace News");
      expect(indexHtml).toContain("Search hackerspaces");
      expect(indexHtml).toContain("Search by hackerspace name");
      expect(indexHtml).toContain('<link rel="icon" href="/favicon.png" type="image/png" />');
      expect(aboutHtml).toContain("About");
      expect(aboutHtml).toContain('<link rel="icon" href="/favicon.png" type="image/png" />');
      expect(feedHtml).toContain("Feed");
      expect(feedHtml).toContain("All countries");
      expect(feedHtml).toContain("Germany");
      expect(feedHtml).toContain("feed-country-select");
      expect(feedHtml).toContain('<link rel="icon" href="/favicon.png" type="image/png" />');
      expect(franceFeedHtml).toContain("Feed · France");
      expect(franceFeedHtml).toContain('value="/feed/countries/france/index.html" selected');
      expect(authorsHtml).toContain("Authors");
      expect(authorsHtml).toContain("Search authors");
      expect(authorsHtml).toContain("All hackerspaces");
      expect(authorsHtml).toContain("Sort authors");
      expect(authorsHtml).toContain("Publication count");
      expect(authorsHtml).toContain("Latest publication");
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
      mkdir(resolve(distDir, "feed"), { recursive: true }),
      mkdir(resolve(distDir, "stale/nested"), { recursive: true }),
    ]);

    await Promise.all([
      writeJson(paths.sourceRows, sourceRowsPayload),
      writeJson(paths.validations, validationsPayload),
      writeJson(paths.normalizedFeeds, normalizedPayload),
      writeFile(resolve(distDir, "feed/index.html"), "<html>stale</html>", "utf8"),
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

  it("logs high-level render milestones when a logger is provided", async () => {
    const logger = vi.fn();

    await renderSite({
      sourceRowsPayload: {
        sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
        sectionTitle: "Spaces with RSS feeds",
        extractedAt: "2026-03-19T20:00:00.000Z",
        urls: [],
      },
      validationsPayload: [],
      normalizedPayload: {
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
            id: "row-1-alpha",
            rowNumber: 1,
            sourceWikiUrl: "https://wiki.hackerspaces.org/Alpha",
            finalFeedUrl: "https://alpha.example/feed.xml",
            siteUrl: "https://alpha.example",
            spaceName: "Alpha",
            country: "Wonderland",
            feedType: "rss",
            status: "parsed_ok",
            items: [
              {
                id: "a-1",
                title: "First post",
                link: "https://alpha.example/post-1",
                resolvedAuthor: "Alice",
                authorSource: "author",
                publishedAt: "2025-01-02T10:00:00.000Z",
                summary: "First summary",
              },
            ],
          },
        ],
        failures: [],
      },
      logger,
      writePages: false,
    });

    const logLines = logger.mock.calls.map(([line]) => line);
    expect(logLines).toContain("[render] loaded inputs: feeds=1 failures=0");
    expect(logLines).toContain("[render] built spaces index model");
    expect(logLines).toContain("[render] built content streams: count=2");
    expect(logLines).toContain("[render] rendering primary stream: pages=1");
    expect(logLines).toContain("[render] primary stream progress: page 1/1");
    expect(logLines).toContain("[render] rendered primary stream");
    expect(logLines).toContain("[render] rendering author pages: authors=1");
    expect(logLines).toContain("[render] author pages progress: item 1/1");
    expect(logLines).toContain("[render] rendered author pages");
    expect(logLines).toContain("[render] rendering secondary streams: count=1");
    expect(logLines).toContain("[render] secondary stream other: pages=1");
    expect(logLines).toContain("[render] secondary stream other progress: page 1/1");
    expect(logLines).toContain("[render] rendered secondary streams");
    expect(logLines).toContain("[render] rendering space pages: spaces=1");
    expect(logLines).toContain("[render] space pages progress: item 1/1");
    expect(logLines).toContain("[render] rendered space pages");
    expect(logLines).toContain("[render] building author directory");
    expect(logLines).toContain("[render] built author directory");
    expect(logLines).toContain("[render] built authors index model: authors=1");
    expect(logLines).toContain("[render] built page models: spaces=1 authors=1 streams=2");
    expect(logLines).toContain("[render] render complete: pages=8");
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
