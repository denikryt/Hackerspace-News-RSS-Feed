import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDir } from "../../_shared/tempDirs.js";

import { renderSite } from "../../../src/renderSite.js";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
});

describe("renderSite", () => {
  it("renders the about page through a static renderer contract without passing source data props", async () => {
    vi.resetModules();

    const renderAboutPage = vi.fn(() => "<html>about</html>");
    vi.doMock("../../../src/renderers/renderAboutPage.js", () => ({
      renderAboutPage,
    }));

    const { renderSite: isolatedRenderSite } = await import("../../../src/renderSite.js");

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

    vi.doUnmock("../../../src/renderers/renderAboutPage.js");
    vi.resetModules();
  });

  it("renders dist pages from local json only and produces reproducible output", async () => {
    const rootDir = await createTrackedTempDir("hnf-render-", tempDirs);

    const dataDir = resolve(rootDir, "data");
    const distDir = resolve(rootDir, "dist");
    const paths = {
      sourceRows: resolve(dataDir, "source_urls.json"),
      validations: resolve(dataDir, "feed_validation.json"),
      normalizedFeeds: resolve(dataDir, "feeds_normalized.json"),
      curatedNormalized: resolve(dataDir, "curated_publications_normalized.json"),
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
              normalizedCategories: ["events"],
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
              normalizedCategories: ["events"],
            },
          ],
        },
      ],
      failures: [],
    };
    const curatedPayload = {
      items: [
        {
          id: "curated-1",
          guid: "https://blog.nachitima.com/interview-with-sasha-hackerspace-stories",
          title: "Interview with Sasha",
          link: "https://blog.nachitima.com/interview-with-sasha-hackerspace-stories",
          resolvedAuthor: "Nachitima",
          authorSource: "author",
          publishedAt: "2025-01-03T10:00:00.000Z",
          summaryText: "Curated summary",
          feedUrl: "https://blog.nachitima.com/feed/",
          siteUrl: "https://blog.nachitima.com",
        },
      ],
      unresolved: [],
      summary: {
        requested: 1,
        resolved: 1,
        unresolved: 0,
        extraFeedsParsed: 1,
        extraFeedFailures: 0,
      },
    };

    await mkdir(resolve(distDir, "news"), { recursive: true });

    await Promise.all([
      writeJson(paths.sourceRows, sourceRowsPayload),
      writeJson(paths.validations, validationsPayload),
      writeJson(paths.normalizedFeeds, normalizedPayload),
      writeJson(paths.curatedNormalized, curatedPayload),
    ]);

    const firstRun = await renderSite({ paths, distDir, now: Date.parse("2026-03-19T12:00:00.000Z"), writePages: true });
    const secondRun = await renderSite({ paths, distDir, now: Date.parse("2026-03-19T12:00:00.000Z"), writePages: true });

    // Fixture items use publishedAt only (no displayDate), so the newspaper builder
    // produces only the base /news artifacts. Newspaper date pages require displayDate.
    expect(Object.keys(firstRun.pages)).toEqual([
      "index.html",
      "about/index.html",
      "curated/index.html",
      "news/dates.json",
      "news/index.html",
      "authors/index.html",
      "authors/alice.html",
      "authors/nachitima.html",
      "spaces/betamachine.html",
      "spaces/c3d2.html",
    ]);
    expect(secondRun.pages).toEqual(firstRun.pages);

    const [indexHtml, aboutHtml, curatedHtml, newsDatesJson, feedHtml, authorsHtml, detailHtml] = await Promise.all([
      readFile(resolve(distDir, "index.html"), "utf8"),
      readFile(resolve(distDir, "about/index.html"), "utf8"),
      readFile(resolve(distDir, "curated/index.html"), "utf8"),
      readFile(resolve(distDir, "news/dates.json"), "utf8"),
      readFile(resolve(distDir, "news/index.html"), "utf8"),
      readFile(resolve(distDir, "authors/index.html"), "utf8"),
      readFile(resolve(distDir, "spaces/betamachine.html"), "utf8"),
    ]);
    const [siteCss, spacesIndexJs, authorsIndexJs] = await Promise.all([
      readFile(resolve(distDir, "site.css"), "utf8"),
      readFile(resolve(distDir, "spaces-index.js"), "utf8"),
      readFile(resolve(distDir, "authors-index.js"), "utf8"),
    ]);
    await access(resolve(distDir, "favicon.png"));
    await access(resolve(distDir, "static/newspaper.css"));

    expect(indexHtml).toContain("Hackerspace News");
    expect(indexHtml).toContain("Search hackerspaces");
    expect(indexHtml).toContain("Search by hackerspace name");
    expect(indexHtml).toContain('<link rel="icon" href="/favicon.png" type="image/png" />');
    expect(indexHtml).toContain('<link rel="stylesheet" href="/site.css" />');
    expect(indexHtml).toContain('<script src="/spaces-index.js"></script>');
    expect(aboutHtml).toContain("About");
    expect(aboutHtml).toContain('<link rel="icon" href="/favicon.png" type="image/png" />');
    expect(aboutHtml).toContain('<link rel="stylesheet" href="/site.css" />');
    expect(curatedHtml).toContain("Curated");
    expect(curatedHtml).toContain("Interview with Sasha");
    expect(JSON.parse(newsDatesJson)).toEqual([]);
    // news/index.html is a redirect to the latest newspaper date page
    expect(feedHtml).toContain('<meta http-equiv="refresh"');
    expect(authorsHtml).toContain("Authors");
    expect(authorsHtml).toContain("Nachitima");
    expect(authorsHtml).toContain("Search authors");
    expect(authorsHtml).toContain("All hackerspaces");
    expect(authorsHtml).toContain("Sort authors");
    expect(authorsHtml).toContain("Publication count");
    expect(authorsHtml).toContain("Latest publication");
    expect(authorsHtml).toContain('<script src="/authors-index.js"></script>');
    expect(detailHtml).toContain("BetaMachine");
    expect(detailHtml).toContain('<link rel="icon" href="/favicon.png" type="image/png" />');
    expect(siteCss).toContain(".content-body.rich-html img");
    expect(siteCss).toContain(".spaces-controls");
    expect(siteCss).toContain(".authors-controls");
    expect(spacesIndexJs).toContain("hackerspace-news-feed.query");
    expect(authorsIndexJs).toContain("hackerspace-news-feed.authors.query");
  });

  it("writes only the current render output into dist without leaving stale artifacts", async () => {
    const rootDir = await createTrackedTempDir("hnf-render-", tempDirs);

    const dataDir = resolve(rootDir, "data");
    const distDir = resolve(rootDir, "dist");
    const paths = {
      sourceRows: resolve(dataDir, "source_urls.json"),
      validations: resolve(dataDir, "feed_validation.json"),
      normalizedFeeds: resolve(dataDir, "feeds_normalized.json"),
      curatedNormalized: resolve(dataDir, "curated_publications_normalized.json"),
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
      mkdir(resolve(distDir, "news"), { recursive: true }),
      mkdir(resolve(distDir, "stale/nested"), { recursive: true }),
    ]);

    await Promise.all([
      writeJson(paths.sourceRows, sourceRowsPayload),
      writeJson(paths.validations, validationsPayload),
      writeJson(paths.normalizedFeeds, normalizedPayload),
      writeJson(paths.curatedNormalized, { items: [], unresolved: [], summary: { requested: 0, resolved: 0, unresolved: 0, extraFeedsParsed: 0, extraFeedFailures: 0 } }),
      writeFile(resolve(distDir, "news/index.html"), "<html>stale</html>", "utf8"),
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
      [...Object.keys(result.pages), "favicon.png", "site.css", "spaces-index.js", "authors-index.js", "static/newspaper.css", "newspaper-nav.js"].sort(),
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
                normalizedCategories: ["events"],
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
    expect(logLines).toContain("[render] newspaper feed: no dates with items found");
    expect(logLines).toContain("[render] rendering author pages: authors=1");
    expect(logLines).toContain("[render] author pages progress: item 1/1");
    expect(logLines).toContain("[render] rendered author pages");
    expect(logLines).toContain("[render] rendering space pages: spaces=1");
    expect(logLines).toContain("[render] space pages progress: item 1/1");
    expect(logLines).toContain("[render] rendered space pages");
    expect(logLines).toContain("[render] building author directory");
    expect(logLines).toContain("[render] built author directory");
    expect(logLines).toContain("[render] built authors index model: authors=1");
    expect(logLines).toContain("[render] built page models: spaces=1 authors=1");
    expect(logLines.some((line) => line.startsWith("[render] render complete:"))).toBe(true);
  });

  it("renders paginated author detail pages when an author has more than one page of items", async () => {
    const result = await renderSite({
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
            items: Array.from({ length: 11 }, (_, index) => ({
              id: `alice-${index + 1}`,
              title: `Alice post ${index + 1}`,
              link: `https://alpha.example/post-${index + 1}`,
              resolvedAuthor: "Alice",
              authorSource: "author",
              publishedAt: `2025-01-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
              summary: `Summary ${index + 1}`,
            })),
          },
        ],
        failures: [],
      },
    });

    expect(Object.keys(result.pages).sort()).toEqual([
      "about/index.html",
      "authors/alice.html",
      "authors/alice/page/2/index.html",
      "authors/index.html",
      "index.html",
      "news/dates.json",
      "news/index.html",
      "spaces/alpha.html",
      "spaces/alpha/page/2/index.html",
    ]);
    expect(result.pages["authors/alice.html"]).toContain("Page 1 of 2");
    expect(result.pages["authors/alice/page/2/index.html"]).toContain("Page 2 of 2");
    expect(result.pages["authors/alice/page/3/index.html"]).toBeUndefined();
  });


  it("rejects invalid normalized payloads before building page output", async () => {
    await expect(() =>
      renderSite({
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
            parsedFeeds: "invalid",
            emptyFeeds: 0,
            failedFeeds: 0,
          },
          feeds: [],
          failures: [],
        },
      }),
    ).rejects.toThrow(/parsedFeeds/i);
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
