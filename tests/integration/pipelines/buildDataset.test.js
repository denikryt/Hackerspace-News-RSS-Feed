import { describe, expect, it, vi } from "vitest";

import { createTextResponse } from "../../_shared/http.js";
import { readFixtureText } from "../../_shared/paths.js";

import { buildDataset } from "../../../src/buildDataset.js";

const sourceHtml = readFixtureText("source-page", "user-jomat-oldid-94788-snippet.html");
const sourcePageUrl = "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds";

describe("buildDataset", () => {
  it("passes refresh artifacts into render and returns only rendered pages in site output", async () => {
    vi.resetModules();
    try {
      const refreshResult = {
        sourceRowsPayload: { urls: [{ rowNumber: 1, candidateFeedUrl: "https://alpha.example/feed.xml" }] },
        validationsPayload: [{ candidateUrl: "https://alpha.example/feed.xml", isParsable: true }],
        normalizedPayload: { feeds: [{ id: "alpha" }], failures: [] },
      };
      const refreshDataset = vi.fn().mockResolvedValue(refreshResult);
      const renderSite = vi.fn().mockResolvedValue({
        pages: {
          "index.html": "<html>home</html>",
          "news/index.html": "<html>feed</html>",
        },
        debugOnly: "ignore-me",
      });

      vi.doMock("../../../src/refreshDataset.js", () => ({
        refreshDataset,
      }));
      vi.doMock("../../../src/renderSite.js", () => ({
        renderSite,
      }));

      const { buildDataset: isolatedBuildDataset } = await import("../../../src/buildDataset.js");

      const fetchImpl = vi.fn();
      const now = Date.parse("2026-04-02T12:00:00.000Z");
      const result = await isolatedBuildDataset({
        sourcePageUrl,
        fetchImpl,
        now,
      });

      expect(refreshDataset).toHaveBeenCalledWith({ sourcePageUrl, fetchImpl });
      expect(renderSite).toHaveBeenCalledWith({
        sourceRowsPayload: refreshResult.sourceRowsPayload,
        validationsPayload: refreshResult.validationsPayload,
        normalizedPayload: refreshResult.normalizedPayload,
        now,
      });
      expect(result).toEqual({
        ...refreshResult,
        site: {
          pages: {
            "index.html": "<html>home</html>",
            "news/index.html": "<html>feed</html>",
          },
        },
      });
    } finally {
      vi.doUnmock("../../../src/refreshDataset.js");
      vi.doUnmock("../../../src/renderSite.js");
      vi.resetModules();
    }
  });

  it("builds source rows, validations, normalized feeds, and html", async () => {
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
                  <author>Alice</author>
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

    const result = await buildDataset({ sourcePageUrl, fetchImpl });

    expect(result.sourceRowsPayload.urls).toHaveLength(3);
    expect(result.validationsPayload).toHaveLength(3);
    expect(result.normalizedPayload.feeds).toHaveLength(1);
    expect(result.normalizedPayload.failures).toHaveLength(2);
    expect(result.normalizedPayload.summary).toMatchObject({
      sourceRows: 3,
      validFeeds: 1,
      parsedFeeds: 1,
      failedFeeds: 2,
    });
    expect(Object.keys(result.site.pages)).toContain("index.html");
    expect(Object.keys(result.site.pages)).toContain("about/index.html");
    expect(Object.keys(result.site.pages)).toContain("news/index.html");
    expect(Object.keys(result.site.pages)).toContain("authors/index.html");
    expect(Object.keys(result.site.pages)).toContain("authors/alice.html");
    expect(Object.keys(result.site.pages)).toContain("spaces/betamachine.html");
    expect(result.site.pages["index.html"]).toContain("Hackerspace News");
    expect(result.site.pages["about/index.html"]).toContain("About");
    // news/index.html is now a meta-refresh redirect to the latest newspaper date page
    expect(result.site.pages["news/index.html"]).toContain('<meta http-equiv="refresh"');
    expect(result.site.pages["authors/index.html"]).toContain("Authors");
    expect(result.site.pages["spaces/betamachine.html"]).toContain("BetaMachine");
  });

  it("builds multiple global feed pages when more than 10 items exist", async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url === sourcePageUrl) {
        return response({
          url,
          contentType: "text/html; charset=utf-8",
          body: sourceHtml,
        });
      }

      if (url === "https://www.betamachine.fr/feed/") {
        const items = Array.from({ length: 11 }, (_, index) => `
          <item>
            <title>Post ${index + 1}</title>
            <link>https://www.betamachine.fr/post-${index + 1}</link>
            <pubDate>Wed, ${String(index + 1).padStart(2, "0")} Jan 2025 10:00:00 GMT</pubDate>
            <description>Hello</description>
          </item>
        `).join("");

        return response({
          url,
          contentType: "application/rss+xml",
          body: `<?xml version="1.0"?>
            <rss version="2.0">
              <channel>
                <title>BetaMachine Feed</title>
                <link>https://www.betamachine.fr</link>
                <description>Latest posts</description>
                ${items}
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

    const result = await buildDataset({ sourcePageUrl, fetchImpl });

    // Newspaper layout: items without displayDate produce only news/index.html (redirect).
    // Pagination is per-date, not across the entire feed.
    expect(Object.keys(result.site.pages)).toContain("news/index.html");
    expect(result.site.pages["news/index.html"]).toContain('<meta http-equiv="refresh"');
    expect(Object.keys(result.site.pages)).not.toContain("news/page/2/index.html");
  });

  it("builds paginated detail pages when a space has more than 10 items", async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url === sourcePageUrl) {
        return response({
          url,
          contentType: "text/html; charset=utf-8",
          body: sourceHtml,
        });
      }

      if (url === "https://www.betamachine.fr/feed/") {
        const items = Array.from({ length: 11 }, (_, index) => `
          <item>
            <title>Space Post ${index + 1}</title>
            <link>https://www.betamachine.fr/space-post-${index + 1}</link>
            <pubDate>Wed, ${String(index + 1).padStart(2, "0")} Jan 2025 10:00:00 GMT</pubDate>
            <description>Hello</description>
          </item>
        `).join("");

        return response({
          url,
          contentType: "application/rss+xml",
          body: `<?xml version="1.0"?>
            <rss version="2.0">
              <channel>
                <title>BetaMachine Feed</title>
                <link>https://www.betamachine.fr</link>
                <description>Latest posts</description>
                ${items}
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

    const result = await buildDataset({ sourcePageUrl, fetchImpl });

    expect(Object.keys(result.site.pages)).toContain("spaces/betamachine.html");
    expect(Object.keys(result.site.pages)).toContain("spaces/betamachine/page/2/index.html");
    expect(result.site.pages["spaces/betamachine.html"]).toContain("Page 1 of 2");
    expect(result.site.pages["spaces/betamachine/page/2/index.html"]).toContain("Page 2 of 2");
  });
});

function response({ url, contentType, body, status = 200 }) {
  return createTextResponse({ url, contentType, body, status });
}
