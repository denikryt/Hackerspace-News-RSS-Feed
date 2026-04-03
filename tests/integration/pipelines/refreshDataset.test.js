import { readFile } from "node:fs/promises";
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
    });
    expect(result.site).toBeUndefined();

    const [sourceRowsJson, validationsJson, normalizedJson] = await Promise.all([
      readFile(paths.sourceRows, "utf8"),
      readFile(paths.validations, "utf8"),
      readFile(paths.normalizedFeeds, "utf8"),
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
      dateSource: "pubDate",
      displayContent: {
        text: "Hello",
        wasTruncated: false,
        format: "text",
        sourceField: "content",
      },
      observed: {
        dateCandidates: [
          {
            field: "isoDate",
            value: "2025-01-01T10:00:00.000Z",
          },
          {
            field: "pubDate",
            value: "2025-01-01T10:00:00.000Z",
          },
        ],
        summaryCandidates: [
          {
            field: "contentSnippet",
            text: "Hello",
          },
        ],
      },
    });
    expect(JSON.parse(normalizedJson).feeds[0].items[0].observed.contentCandidates).toBeUndefined();
    expect(JSON.parse(normalizedJson).feeds[0].items[0].summaryText).toBeUndefined();
    expect(JSON.parse(normalizedJson).feeds[0].items[0].summarySource).toBeUndefined();
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
