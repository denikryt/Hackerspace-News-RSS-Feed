import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createTextResponse } from "../../_shared/http.js";
import { readFixtureText } from "../../_shared/paths.js";
import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDir } from "../../_shared/tempDirs.js";

import { refreshDataset } from "../../../src/refreshDataset.js";

const sourceHtml = readFixtureText("source-page", "user-jomat-oldid-94788-snippet.html");
const sourcePageUrl = "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
});

describe("refreshDataset", () => {
  it("returns only data artifacts and writes snapshot files without html pages", async () => {
    const outputDir = await createTrackedTempDir("hnf-refresh-", tempDirs);

    const paths = {
      sourceRows: resolve(outputDir, "data/source_urls.json"),
      validations: resolve(outputDir, "data/feed_validation.json"),
      normalizedFeeds: resolve(outputDir, "data/feeds_normalized.json"),
      curatedNormalized: resolve(outputDir, "data/curated_publications_normalized.json"),
    };

    const fetchImpl = vi.fn(async (url) => {
      if (url === sourcePageUrl) {
        return response({
          url,
          contentType: "text/html; charset=utf-8",
          body: sourceHtml,
        });
      }

      if (url === "https://www.betamachine.fr/feed/") {
        return response({
          url,
          contentType: "application/rss+xml",
          body: `<?xml version="1.0"?>
            <rss version="2.0">
              <channel>
                <title>BetaMachine Feed</title>
                <link>https://www.betamachine.fr</link>
                <description>Latest posts</description>
                <item>
                  <title>Post one</title>
                  <link>https://www.betamachine.fr/post-1</link>
                  <pubDate>Wed, 01 Jan 2025 10:00:00 GMT</pubDate>
                  <description>Hello</description>
                </item>
              </channel>
            </rss>`,
        });
      }

      return response({
        url,
        contentType: "text/html; charset=utf-8",
        body: "<html><body>not a feed</body></html>",
      });
    });

    const result = await refreshDataset({ sourcePageUrl, fetchImpl, paths, writeSnapshots: true });

    expect(result).toEqual({
      sourceRowsPayload: expect.any(Object),
      validationsPayload: expect.any(Array),
      normalizedPayload: expect.any(Object),
      curatedPayload: expect.any(Object),
    });
    expect(result.site).toBeUndefined();

    const [sourceRowsJson, validationsJson, normalizedJson, curatedJson] = await Promise.all([
      readFile(paths.sourceRows, "utf8"),
      readFile(paths.validations, "utf8"),
      readFile(paths.normalizedFeeds, "utf8"),
      readFile(paths.curatedNormalized, "utf8"),
    ]);

    expect(JSON.parse(sourceRowsJson).urls).toHaveLength(3);
    expect(JSON.parse(validationsJson)).toHaveLength(3);
    expect(JSON.parse(normalizedJson)).toMatchObject({
      summary: {
        sourceRows: 3,
        validFeeds: 1,
        parsedFeeds: 1,
        failedFeeds: 2,
      },
    });
    expect(JSON.parse(normalizedJson).feeds[0].items[0]).toMatchObject({
      title: "Post one",
      displayDate: "2025-01-01T10:00:00.000Z",
      summaryText: "Hello",
    });
expect(JSON.parse(curatedJson)).toEqual({
      items: [],
      unresolved: [],
      summary: {
        requested: 0,
        resolved: 0,
        unresolved: 0,
        extraFeedsParsed: 0,
        extraFeedFailures: 0,
      },
    });
  });

  it("logs feed fetch progress and outcomes when a logger is provided", async () => {
    const logger = vi.fn();
    const fetchImpl = vi.fn(async (url) => {
      if (url === sourcePageUrl) {
        return response({
          url,
          contentType: "text/html; charset=utf-8",
          body: sourceHtml,
        });
      }

      if (url === "https://www.betamachine.fr/feed/") {
        return response({
          url,
          contentType: "application/rss+xml",
          body: `<?xml version="1.0"?>
            <rss version="2.0">
              <channel>
                <title>BetaMachine Feed</title>
                <link>https://www.betamachine.fr</link>
                <description>Latest posts</description>
                <item>
                  <title>Post one</title>
                  <link>https://www.betamachine.fr/post-1</link>
                  <pubDate>Wed, 01 Jan 2025 10:00:00 GMT</pubDate>
                  <description>Hello</description>
                </item>
              </channel>
            </rss>`,
        });
      }

      return response({
        url,
        contentType: "text/html; charset=utf-8",
        body: "<html><body>not a feed</body></html>",
      });
    });

    await refreshDataset({
      sourcePageUrl,
      fetchImpl,
      logger,
    });

    const logLines = logger.mock.calls.map(([line]) => line);
    expect(logLines).toContain("[refresh] source rows extracted: 3");
    expect(logLines).toContain("[refresh] probing feed 1/3: https://t.me/akiba_space");
    expect(logLines).toContain("[refresh] failed feed 1/3: https://t.me/akiba_space (non_xml_response: 200)");
    expect(logLines).toContain("[refresh] probing feed 2/3: https://www.betamachine.fr/feed/");
    expect(logLines).toContain("[refresh] parsed feed 2/3: https://www.betamachine.fr/feed/ -> https://www.betamachine.fr/feed/ (items=1)");
    expect(logLines).toContain("[refresh] probing feed 3/3: https://trac.raumfahrtagentur.org/blog?format=rss&user=anonymous");
    expect(logLines).toContain("[refresh] failed feed 3/3: https://trac.raumfahrtagentur.org/blog?format=rss&user=anonymous (non_xml_response: 200)");
    expect(logLines).toContain("[refresh] refresh complete: feeds=1 failures=2");
  });

  it("resolves curated publications from a local yaml list without changing wiki source summary", async () => {
    const outputDir = await mkdtemp(resolve(tmpdir(), "hnf-refresh-curated-"));
    tempDirs.push(outputDir);

    const paths = {
      sourceRows: resolve(outputDir, "data/source_urls.json"),
      validations: resolve(outputDir, "data/feed_validation.json"),
      normalizedFeeds: resolve(outputDir, "data/feeds_normalized.json"),
      curatedNormalized: resolve(outputDir, "data/curated_publications_normalized.json"),
      curatedPublications: resolve(outputDir, "content/curated_publications.yml"),
    };

    await mkdir(resolve(outputDir, "content"), { recursive: true });
    await writeFile(
      paths.curatedPublications,
      `- feedUrl: https://blog.nachitima.com/feed/\n  guid: https://blog.nachitima.com/interview-with-sasha-hackerspace-stories\n`,
      "utf8",
    );

    const fetchImpl = vi.fn(async (url) => {
      if (url === sourcePageUrl) {
        return response({
          url,
          contentType: "text/html; charset=utf-8",
          body: sourceHtml,
        });
      }

      if (url === "https://www.betamachine.fr/feed/") {
        return response({
          url,
          contentType: "application/rss+xml",
          body: `<?xml version="1.0"?>
            <rss version="2.0">
              <channel>
                <title>BetaMachine Feed</title>
                <link>https://www.betamachine.fr</link>
                <description>Latest posts</description>
                <item>
                  <title>Post one</title>
                  <guid>beta-1</guid>
                  <link>https://www.betamachine.fr/post-1</link>
                  <author>Alice</author>
                  <pubDate>Wed, 01 Jan 2025 10:00:00 GMT</pubDate>
                  <description>Hello</description>
                </item>
              </channel>
            </rss>`,
        });
      }

      if (url === "https://blog.nachitima.com/feed/") {
        return response({
          url,
          contentType: "application/rss+xml",
          body: `<?xml version="1.0"?>
            <rss version="2.0">
              <channel>
                <title>Nachitima Blog</title>
                <link>https://blog.nachitima.com</link>
                <description>Independent writing</description>
                <item>
                  <title>Interview with Sasha</title>
                  <guid>https://blog.nachitima.com/interview-with-sasha-hackerspace-stories</guid>
                  <link>https://blog.nachitima.com/interview-with-sasha-hackerspace-stories</link>
                  <author>Nachitima</author>
                  <pubDate>Thu, 02 Jan 2025 10:00:00 GMT</pubDate>
                  <description>Curated hello</description>
                </item>
              </channel>
            </rss>`,
        });
      }

      return response({
        url,
        contentType: "text/html; charset=utf-8",
        body: "<html><body>not a feed</body></html>",
      });
    });

    const result = await refreshDataset({ sourcePageUrl, fetchImpl, paths, writeSnapshots: true });

    expect(result.normalizedPayload.summary).toMatchObject({
      sourceRows: 3,
      parsedFeeds: 1,
      failedFeeds: 2,
    });
    expect(result.normalizedPayload.curated).toBeUndefined();
    expect(result.curatedPayload.items).toHaveLength(1);
    expect(result.curatedPayload.items[0]).toMatchObject({
      title: "Interview with Sasha",
      guid: "https://blog.nachitima.com/interview-with-sasha-hackerspace-stories",
      resolvedAuthor: "Nachitima",
      feedUrl: "https://blog.nachitima.com/feed/",
    });
    expect(result.curatedPayload.unresolved).toEqual([]);

    const curatedJson = JSON.parse(await readFile(paths.curatedNormalized, "utf8"));
    expect(curatedJson).toMatchObject({
      items: [
        expect.objectContaining({
          title: "Interview with Sasha",
          guid: "https://blog.nachitima.com/interview-with-sasha-hackerspace-stories",
        }),
      ],
      unresolved: [],
      summary: {
        requested: 1,
        resolved: 1,
        unresolved: 0,
      },
    });
  });

  it("probes feeds with concurrency capped at 4", async () => {
    vi.resetModules();

    let activeCount = 0;
    let peakConcurrency = 0;

    vi.doMock("../../../src/pageFetcher.js", () => ({
      fetchPageHtml: vi.fn().mockResolvedValue("<html>source</html>"),
    }));
    vi.doMock("../../../src/sourceTableExtractor.js", () => ({
      extractSourceRows: vi.fn().mockReturnValue(
        Array.from({ length: 9 }, (_, index) => ({
          rowNumber: index + 1,
          hackerspaceName: `Space ${index + 1}`,
          country: "Testland",
          hackerspaceWikiUrl: `https://example.com/wiki/${index + 1}`,
          candidateFeedUrl: `https://example.com/feed-${index + 1}.xml`,
        })),
      ),
    }));
    vi.doMock("../../../src/feedProbe.js", () => ({
      probeFeedUrl: vi.fn(async ({ sourceRow }) => {
        activeCount += 1;
        peakConcurrency = Math.max(peakConcurrency, activeCount);
        await wait(10);
        activeCount -= 1;

        return {
          candidateUrl: sourceRow.candidateFeedUrl,
          finalUrl: sourceRow.candidateFeedUrl,
          httpStatus: 200,
          contentType: "application/rss+xml",
          fetchOk: true,
          isFeedLike: true,
          isParsable: true,
          detectedFormat: "rss",
          errorCode: null,
          errorMessage: undefined,
          body: `<?xml version="1.0"?><rss><channel><title>${sourceRow.hackerspaceName}</title></channel></rss>`,
        };
      }),
    }));

    const { refreshDataset: isolatedRefreshDataset } = await import("../../../src/refreshDataset.js");

    await isolatedRefreshDataset();

    expect(peakConcurrency).toBe(4);

    vi.doUnmock("../../../src/pageFetcher.js");
    vi.doUnmock("../../../src/sourceTableExtractor.js");
    vi.doUnmock("../../../src/feedProbe.js");
    vi.resetModules();
  });

  it("adds discovery-valid rows only when explicitly provided and keeps wiki priority on overlap", async () => {
    vi.resetModules();
    const outputDir = await mkdtemp(resolve(tmpdir(), "hnf-refresh-"));
    tempDirs.push(outputDir);

    const feedProbe = vi.fn(async ({ sourceRow }) => ({
      candidateUrl: sourceRow.candidateFeedUrl,
      finalUrl: sourceRow.candidateFeedUrl,
      httpStatus: 200,
      contentType: "application/rss+xml",
      fetchOk: true,
      isFeedLike: true,
      isParsable: true,
      detectedFormat: "rss",
      errorCode: null,
      errorMessage: undefined,
      body: `<?xml version="1.0"?><rss><channel><title>${sourceRow.hackerspaceName}</title><item><title>One</title><link>${sourceRow.candidateFeedUrl}/post-1</link></item></channel></rss>`,
    }));

    vi.doMock("../../../src/pageFetcher.js", () => ({
      fetchPageHtml: vi.fn().mockResolvedValue("<html>source</html>"),
    }));
    vi.doMock("../../../src/sourceTableExtractor.js", () => ({
      extractSourceRows: vi.fn().mockReturnValue([
        {
          rowNumber: 1,
          hackerspaceName: "Wiki Alpha",
          country: "Wonderland",
          hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Alpha",
          candidateFeedUrl: "https://wiki-alpha.example/feed.xml",
        },
      ]),
    }));
    vi.doMock("../../../src/feedProbe.js", () => ({
      probeFeedUrl: feedProbe,
    }));

    const { refreshDataset: isolatedRefreshDataset } = await import("../../../src/refreshDataset.js");

    const result = await isolatedRefreshDataset({
      paths: {
        sourceRows: resolve(outputDir, "data/source_urls.json"),
        validations: resolve(outputDir, "data/feed_validation.json"),
        normalizedFeeds: resolve(outputDir, "data/feeds_normalized.json"),
        curatedPublications: resolve(outputDir, "content/missing-curated.yml"),
      },
      additionalSourceRows: [
        {
          hackerspaceName: "Discovery Alpha",
          hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Alpha",
          country: "Wonderland",
          candidateFeedUrl: "https://discovery-alpha.example/feed.xml",
          sourceType: "discovery",
        },
        {
          hackerspaceName: "Discovery Beta",
          hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Beta",
          country: "Nowhere",
          candidateFeedUrl: "https://discovery-beta.example/feed.xml",
          sourceType: "discovery",
        },
      ],
    });

    expect(result.sourceRowsPayload.urls).toEqual([
      expect.objectContaining({
        rowNumber: 1,
        hackerspaceName: "Wiki Alpha",
        candidateFeedUrl: "https://wiki-alpha.example/feed.xml",
      }),
      expect.objectContaining({
        rowNumber: 2,
        hackerspaceName: "Discovery Beta",
        candidateFeedUrl: "https://discovery-beta.example/feed.xml",
        sourceType: "discovery",
      }),
    ]);
    expect(feedProbe).toHaveBeenCalledTimes(2);
    expect(feedProbe.mock.calls.map(([call]) => call.sourceRow.candidateFeedUrl)).toEqual([
      "https://wiki-alpha.example/feed.xml",
      "https://discovery-beta.example/feed.xml",
    ]);

    vi.doUnmock("../../../src/pageFetcher.js");
    vi.doUnmock("../../../src/sourceTableExtractor.js");
    vi.doUnmock("../../../src/feedProbe.js");
    vi.resetModules();
  });
});

function response({ url, contentType, body, status = 200 }) {
  return createTextResponse({ url, contentType, body, status });
}

function wait(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
