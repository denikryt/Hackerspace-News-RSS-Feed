import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { refreshDataset } from "../src/refreshDataset.js";

const fixturePath =
  "/home/denchik/projects/Hackerspace News Feed/tests/fixtures/source-page/user-jomat-oldid-94788-snippet.html";
const sourceHtml = readFileSync(fixturePath, "utf8");
const sourcePageUrl = "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds";

const tempDirs = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("refreshDataset", () => {
  it("returns only data artifacts and writes snapshot files without html pages", async () => {
    const outputDir = await mkdtemp(resolve(tmpdir(), "hnf-refresh-"));
    tempDirs.push(outputDir);

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
