import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { buildDataset } from "../src/buildDataset.js";

const fixturePath =
  "/home/denchik/projects/Hackerspace News Feed/tests/fixtures/source-page/user-jomat-oldid-94788-snippet.html";
const sourceHtml = readFileSync(fixturePath, "utf8");
const sourcePageUrl = "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds";

describe("buildDataset", () => {
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
    expect(Object.keys(result.site.pages)).toContain("feed/index.html");
    expect(Object.keys(result.site.pages)).toContain("spaces/betamachine.html");
    expect(result.site.pages["index.html"]).toContain("Hackerspace News");
    expect(result.site.pages["feed/index.html"]).toContain("Global Feed");
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

    expect(Object.keys(result.site.pages)).toContain("feed/index.html");
    expect(Object.keys(result.site.pages)).toContain("feed/page/2/index.html");
    expect(result.site.pages["feed/index.html"]).toContain("Page 1 of 2");
    expect(result.site.pages["feed/page/2/index.html"]).toContain("Page 2 of 2");
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
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: new Headers({ "content-type": contentType }),
    text: () => Promise.resolve(body),
  };
}
