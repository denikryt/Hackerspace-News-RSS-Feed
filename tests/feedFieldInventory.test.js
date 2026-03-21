import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

import { afterEach, describe, expect, it, vi } from "vitest";

import { analyzeFeedFields } from "../src/feedFieldInventory.js";

const fixturePath = resolve(
  process.cwd(),
  "tests/fixtures/source-page/user-jomat-oldid-94788-snippet.html",
);
const sourceHtml = readFileSync(fixturePath, "utf8");
const sourcePageUrl = "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds";

const tempDirs = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("analyzeFeedFields", () => {
  it("builds a decision-oriented inventory report from mixed feeds", async () => {
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
            <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
              <channel>
                <title>BetaMachine Feed</title>
                <link>https://www.betamachine.fr</link>
                <description>Latest posts</description>
                <item>
                  <title>Post one</title>
                  <link>https://www.betamachine.fr/post-1</link>
                  <pubDate>Wed, 01 Jan 2025 10:00:00 GMT</pubDate>
                  <dc:creator>Denchik</dc:creator>
                  <category>Events</category>
                  <description>Hello summary</description>
                  <content:encoded><![CDATA[<p>Hello full content body</p>]]></content:encoded>
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

    const result = await analyzeFeedFields({ sourcePageUrl, fetchImpl });

    expect(result).toMatchObject({
      sourceCount: 3,
      analyzedFeedCount: 1,
      failedFeedCount: 2,
      parsedFeedFields: expect.any(Array),
      parsedItemFields: expect.any(Array),
      rawXmlTags: expect.any(Array),
      rawXmlNamespacedTags: expect.any(Array),
      authorFieldCandidates: expect.any(Array),
      categoryFieldCandidates: expect.any(Array),
      contentFieldCandidates: expect.any(Array),
      summaryFieldCandidates: expect.any(Array),
      dateFieldCandidates: expect.any(Array),
      feedsWithMinimalItems: expect.any(Array),
      feedsWithoutUsefulContent: expect.any(Array),
      sourceSpecificObservations: expect.any(Array),
      feeds: expect.any(Array),
      errors: expect.any(Array),
    });

    expect(result.parsedItemFields.map((field) => field.name)).toEqual(
      expect.arrayContaining(["title", "link", "creator", "categories", "content:encoded"]),
    );
    expect(result.rawXmlNamespacedTags.map((field) => field.name)).toEqual(
      expect.arrayContaining(["dc:creator", "content:encoded"]),
    );
    expect(result.authorFieldCandidates.map((field) => field.name)).toContain("creator");
    expect(result.categoryFieldCandidates.map((field) => field.name)).toContain("categories");
    expect(result.contentFieldCandidates.map((field) => field.name)).toContain("content:encoded");
    expect(result.summaryFieldCandidates.map((field) => field.name)).toContain("contentSnippet");
    expect(result.dateFieldCandidates.map((field) => field.name)).toEqual(
      expect.arrayContaining(["pubDate", "isoDate"]),
    );
    expect(result.feedsWithMinimalItems).toEqual([]);
    expect(result.feedsWithoutUsefulContent).toEqual([]);
    expect(result.errors).toHaveLength(2);
  });

  it("writes json and markdown artifacts", async () => {
    const outputDir = await mkdtemp(resolve(tmpdir(), "hnf-analysis-"));
    tempDirs.push(outputDir);

    const jsonPath = resolve(outputDir, "analysis/feed_field_inventory.json");
    const markdownPath = resolve(outputDir, "analysis/feed_field_inventory.md");

    const fetchImpl = vi.fn(async (url) => {
      if (url === sourcePageUrl) {
        return response({
          url,
          contentType: "text/html; charset=utf-8",
          body: sourceHtml,
        });
      }

      return response({
        url,
        contentType: "application/rss+xml",
        body: `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>Generic Feed</title>
              <link>https://example.com</link>
              <description>Latest posts</description>
              <item>
                <title>Post one</title>
                <link>https://example.com/post-1</link>
                <pubDate>Wed, 01 Jan 2025 10:00:00 GMT</pubDate>
                <description>Hello summary</description>
              </item>
            </channel>
          </rss>`,
      });
    });

    await analyzeFeedFields({
      sourcePageUrl,
      fetchImpl,
      writeArtifacts: true,
      paths: {
        jsonReport: jsonPath,
        markdownReport: markdownPath,
      },
    });

    const [jsonText, markdownText] = await Promise.all([
      readFile(jsonPath, "utf8"),
      readFile(markdownPath, "utf8"),
    ]);

    expect(JSON.parse(jsonText)).toMatchObject({
      sourceCount: 3,
      analyzedFeedCount: 3,
    });
    expect(markdownText).toContain("# Feed Field Inventory Summary");
    expect(markdownText).toContain("## Top Author Candidates");
    expect(markdownText).toContain("## Recommended Next Decisions");
  });

  it("runs the analysis CLI and exits successfully", async () => {
    const outputDir = await mkdtemp(resolve(tmpdir(), "hnf-analysis-cli-"));
    tempDirs.push(outputDir);

    const jsonPath = resolve(outputDir, "analysis/feed_field_inventory.json");
    const markdownPath = resolve(outputDir, "analysis/feed_field_inventory.md");

    const fetchModulePath = resolve(outputDir, "mock-fetch.mjs");
    await writeFile(fetchModulePath, `
      import { readFileSync } from "node:fs";
      import { resolve } from "node:path";

      const fixturePath = resolve(${JSON.stringify(process.cwd())}, "tests/fixtures/source-page/user-jomat-oldid-94788-snippet.html");
      const sourceHtml = readFileSync(fixturePath, "utf8");
      const sourcePageUrl = ${JSON.stringify(sourcePageUrl)};

      globalThis.fetch = async (url) => {
        if (url === sourcePageUrl) {
          return {
            ok: true,
            status: 200,
            url,
            headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
            text: async () => sourceHtml,
          };
        }

        return {
          ok: true,
          status: 200,
          url,
          headers: new Headers({ "content-type": "application/rss+xml" }),
          text: async () => \`<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title><link>https://example.com</link><description>X</description><item><title>Post</title><link>https://example.com/post</link><pubDate>Wed, 01 Jan 2025 10:00:00 GMT</pubDate><description>Hello</description></item></channel></rss>\`,
        };
      };
    `, "utf8");

    execFileSync(process.execPath, [
      "--import",
      fetchModulePath,
      resolve(process.cwd(), "src/cli/analyze.js"),
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SOURCE_PAGE_URL: sourcePageUrl,
        ANALYSIS_JSON_PATH: jsonPath,
        ANALYSIS_MARKDOWN_PATH: markdownPath,
      },
      stdio: "pipe",
    });

    const [jsonText, markdownText] = await Promise.all([
      readFile(jsonPath, "utf8"),
      readFile(markdownPath, "utf8"),
    ]);

    expect(JSON.parse(jsonText)).toMatchObject({
      sourceCount: 3,
      analyzedFeedCount: 3,
    });
    expect(markdownText).toContain("# Feed Field Inventory Summary");
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
