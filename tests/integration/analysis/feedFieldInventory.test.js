import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createTextResponse } from "../../_shared/http.js";
import { readFixtureText } from "../../_shared/paths.js";
import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDir } from "../../_shared/tempDirs.js";

import {
  analyzeFeedFields,
  renderCategoriesByHackerspaceMarkdown,
  renderMarkdownSummary,
  renderObservedCategoryValuesMarkdown,
} from "../../../src/feedFieldInventory.js";

const sourceHtml = readFixtureText("source-page", "user-jomat-oldid-94788-snippet.html");
const sourcePageUrl = "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
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
      allObservedFields: expect.any(Array),
      semanticFieldMappings: expect.any(Array),
      authorValues: expect.any(Array),
      categoryValues: expect.any(Array),
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
    expect(result.allObservedFields.map((field) => field.name)).toEqual(
      expect.arrayContaining(["title", "link", "creator", "categories", "content:encoded", "pubDate"]),
    );
    expect(result.semanticFieldMappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          semanticRole: "author",
          fieldNames: expect.arrayContaining(["creator"]),
        }),
        expect.objectContaining({
          semanticRole: "category",
          fieldNames: expect.arrayContaining(["categories"]),
        }),
      ]),
    );
    expect(result.authorValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: "Denchik",
        }),
      ]),
    );
    expect(result.categoryValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: "Events",
        }),
      ]),
    );
    expect(renderMarkdownSummary(result)).not.toContain("## Observed Category Values");
    expect(renderObservedCategoryValuesMarkdown(result)).toContain("`Events` - 1 [BetaMachine]");
    expect(result.dateFieldCandidates.map((field) => field.name)).toEqual(
      expect.arrayContaining(["pubDate", "isoDate"]),
    );
    expect(result.feedsWithMinimalItems).toEqual([]);
    expect(result.feedsWithoutUsefulContent).toEqual([]);
    expect(result.errors).toHaveLength(2);
  });

  it("writes json and markdown artifacts", async () => {
    const outputDir = await createTrackedTempDir("hnf-analysis-", tempDirs);

    const jsonPath = resolve(outputDir, "analysis/feed_field_inventory.json");
    const markdownPath = resolve(outputDir, "analysis/feed_field_inventory.md");
    const categoryValuesPath = resolve(outputDir, "analysis/observed_category_values.md");
    const categoriesBySpacePath = resolve(outputDir, "analysis/categories_by_hackerspace.md");

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
        categoryValuesReport: categoryValuesPath,
        categoriesBySpaceReport: categoriesBySpacePath,
      },
    });

    const [jsonText, markdownText, categoryValuesText, categoriesBySpaceText] = await Promise.all([
      readFile(jsonPath, "utf8"),
      readFile(markdownPath, "utf8"),
      readFile(categoryValuesPath, "utf8"),
      readFile(categoriesBySpacePath, "utf8"),
    ]);

    expect(JSON.parse(jsonText)).toMatchObject({
      sourceCount: 3,
      analyzedFeedCount: 3,
    });
    expect(markdownText).toContain("# Feed Field Inventory Summary");
    expect(markdownText).toContain("## Observed Author Values");
    expect(markdownText).toContain("## All Observed Fields");
    expect(markdownText).toContain("## Semantic Field Mappings");
    expect(markdownText).not.toContain("## Observed Category Values");
    expect(categoryValuesText).toContain("# Observed Category Values");
    expect(categoriesBySpaceText).toContain("# Categories By Hackerspace");
  });

  it("uses the deduped selected source rows as sourceCount when consuming shared collected records", async () => {
    const result = await analyzeFeedFields({
      sourceRows: [
        {
          rowNumber: 1,
          hackerspaceName: "Wiki Alpha",
          candidateFeedUrl: "https://alpha.example/feed.xml",
        },
        {
          rowNumber: 2,
          hackerspaceName: "Discovery Gamma",
          candidateFeedUrl: "https://gamma.example/feed.xml",
          sourceType: "discovery",
        },
      ],
      collectedRecords: [
        {
          sourceRow: {
            rowNumber: 1,
            hackerspaceName: "Wiki Alpha",
            candidateFeedUrl: "https://alpha.example/feed.xml",
          },
          validation: {
            finalUrl: "https://alpha.example/feed.xml",
            fetchOk: true,
            isParsable: true,
          },
          parsedFeed: {
            title: "Alpha feed",
            items: [{ title: "One", link: "https://alpha.example/post-1" }],
          },
          parseError: null,
          rawXmlBody: "<?xml version=\"1.0\"?><rss><channel><item><title>One</title></item></channel></rss>",
          status: "parsed",
        },
        {
          sourceRow: {
            rowNumber: 2,
            hackerspaceName: "Discovery Gamma",
            candidateFeedUrl: "https://gamma.example/feed.xml",
            sourceType: "discovery",
          },
          validation: {
            finalUrl: "https://gamma.example/feed.xml",
            fetchOk: false,
            isParsable: false,
            errorCode: "http_error",
            errorMessage: "HTTP 500",
          },
          parsedFeed: null,
          parseError: null,
          rawXmlBody: null,
          status: "validation_error",
        },
      ],
    });

    expect(result.sourceCount).toBe(2);
    expect(result.analyzedFeedCount).toBe(1);
    expect(result.failedFeedCount).toBe(1);
  });

  it("serializes array-of-object item fields without crashing the inventory report", async () => {
    const result = await analyzeFeedFields({
      sourceRows: [
        {
          rowNumber: 1,
          hackerspaceName: "Media Space",
          candidateFeedUrl: "https://media.example/feed.xml",
        },
      ],
      collectedRecords: [
        {
          sourceRow: {
            rowNumber: 1,
            hackerspaceName: "Media Space",
            candidateFeedUrl: "https://media.example/feed.xml",
          },
          validation: {
            finalUrl: "https://media.example/feed.xml",
            fetchOk: true,
            isParsable: true,
            detectedFormat: "rss",
          },
          parsedFeed: {
            title: "Media feed",
            items: [
              {
                title: "One",
                link: "https://media.example/post-1",
                "media:content": [
                  Object.assign(Object.create(null), {
                    $: {
                      url: "https://media.example/image.jpg",
                      type: "image/jpeg",
                    },
                  }),
                ],
              },
            ],
          },
          parseError: null,
          rawXmlBody: "<?xml version=\"1.0\"?><rss><channel><item><media:content url=\"https://media.example/image.jpg\" type=\"image/jpeg\" /></item></channel></rss>",
          status: "parsed",
        },
      ],
    });

    expect(result.parsedItemFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "media:content",
          sampleValues: [
            '{"$":{"url":"https://media.example/image.jpg","type":"image/jpeg"}}',
          ],
        }),
      ]),
    );
  });

  it("serializes object-like author and category values without crashing the inventory report", async () => {
    const authorValue = Object.assign(Object.create(null), {
      name: "Denchik",
      uri: "https://authors.example/denchik",
    });
    const categoryValue = Object.assign(Object.create(null), {
      term: "Events",
      scheme: "https://schema.example/categories",
    });

    const result = await analyzeFeedFields({
      sourceRows: [
        {
          rowNumber: 1,
          hackerspaceName: "Structured Space",
          candidateFeedUrl: "https://structured.example/feed.xml",
        },
      ],
      collectedRecords: [
        {
          sourceRow: {
            rowNumber: 1,
            hackerspaceName: "Structured Space",
            candidateFeedUrl: "https://structured.example/feed.xml",
          },
          validation: {
            finalUrl: "https://structured.example/feed.xml",
            fetchOk: true,
            isParsable: true,
            detectedFormat: "atom",
          },
          parsedFeed: {
            title: "Structured feed",
            items: [
              {
                title: "One",
                link: "https://structured.example/post-1",
                creator: authorValue,
                categories: [categoryValue],
              },
            ],
          },
          parseError: null,
          rawXmlBody: "<?xml version=\"1.0\"?><feed><entry><author><name>Denchik</name></author><category term=\"Events\" /></entry></feed>",
          status: "parsed",
        },
      ],
    });

    expect(result.authorValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: '{"name":"Denchik","uri":"https://authors.example/denchik"}',
        }),
      ]),
    );
    expect(result.categoryValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: '{"term":"Events","scheme":"https://schema.example/categories"}',
        }),
      ]),
    );
    expect(result.categoriesByHackerspace).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          hackerspaceName: "Structured Space",
          categories: expect.arrayContaining([
            expect.objectContaining({
              value: '{"term":"Events","scheme":"https://schema.example/categories"}',
            }),
          ]),
        }),
      ]),
    );
  });

  it("runs the analysis CLI and exits successfully", async () => {
    const outputDir = await createTrackedTempDir("hnf-analysis-cli-", tempDirs);

    const jsonPath = resolve(outputDir, "analysis/feed_field_inventory.json");
    const markdownPath = resolve(outputDir, "analysis/feed_field_inventory.md");
    const categoryValuesPath = resolve(outputDir, "analysis/observed_category_values.md");
    const categoriesBySpacePath = resolve(outputDir, "analysis/categories_by_hackerspace.md");
    const contentComparisonPath = resolve(outputDir, "analysis/content_comparison.json");

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
        ANALYSIS_CATEGORY_VALUES_PATH: categoryValuesPath,
        ANALYSIS_CATEGORIES_BY_SPACE_PATH: categoriesBySpacePath,
        ANALYSIS_CONTENT_COMPARISON_PATH: contentComparisonPath,
      },
      stdio: "pipe",
    });

    const [jsonText, markdownText, categoryValuesText, categoriesBySpaceText, contentComparisonText] = await Promise.all([
      readFile(jsonPath, "utf8"),
      readFile(markdownPath, "utf8"),
      readFile(categoryValuesPath, "utf8"),
      readFile(categoriesBySpacePath, "utf8"),
      readFile(contentComparisonPath, "utf8"),
    ]);

    expect(JSON.parse(jsonText)).toMatchObject({
      sourceCount: 3,
      analyzedFeedCount: 3,
    });
    expect(markdownText).toContain("# Feed Field Inventory Summary");
    expect(categoryValuesText).toContain("# Observed Category Values");
    expect(categoriesBySpaceText).toContain("# Categories By Hackerspace");
    expect(JSON.parse(contentComparisonText)).toMatchObject({
      feedsProcessed: 3,
    });
  });

  it("uses default artifact paths when CLI env overrides are not provided", async () => {
    const outputDir = await createTrackedTempDir("hnf-analysis-cli-defaults-", tempDirs);

    const fetchModulePath = resolve(outputDir, "mock-fetch-defaults.mjs");
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
      cwd: outputDir,
      env: {
        ...process.env,
        SOURCE_PAGE_URL: sourcePageUrl,
      },
      stdio: "pipe",
    });

    const [jsonText, markdownText, categoryValuesText, contentComparisonText] = await Promise.all([
      readFile(resolve(outputDir, "analysis/feed_field_inventory.json"), "utf8"),
      readFile(resolve(outputDir, "analysis/feed_field_inventory.md"), "utf8"),
      readFile(resolve(outputDir, "analysis/observed_category_values.md"), "utf8"),
      readFile(resolve(outputDir, "analysis/content_comparison.json"), "utf8"),
    ]);

    expect(JSON.parse(jsonText)).toMatchObject({
      sourceCount: 3,
      analyzedFeedCount: 3,
    });
    expect(markdownText).toContain("# Feed Field Inventory Summary");
    expect(categoryValuesText).toContain("# Observed Category Values");
    expect(JSON.parse(contentComparisonText)).toMatchObject({
      feedsProcessed: 3,
    });
  });

  it("renders categories grouped by hackerspace with local and global counts", () => {
    const markdown = renderCategoriesByHackerspaceMarkdown({
      categoriesByHackerspace: [
        {
          hackerspaceName: "Hackerspace-1",
          publicationCount: 50,
          categories: [
            {
              value: "category-1",
              localCount: 5,
              globalCount: 10,
              otherHackerspaces: ["Hackerspace-3"],
            },
            {
              value: "category-2",
              localCount: 1,
              globalCount: 5,
              otherHackerspaces: ["Hackerspace-2"],
            },
          ],
        },
        {
          hackerspaceName: "Hackerspace-2",
          publicationCount: 12,
          categories: [
            {
              value: "category-2",
              localCount: 3,
              globalCount: 5,
              otherHackerspaces: ["Hackerspace-1"],
            },
            {
              value: "category-3",
              localCount: 1,
              globalCount: 1,
              otherHackerspaces: [],
            },
          ],
        },
      ],
      categoriesByReach: [
        {
          value: "category-2",
          hackerspaceCount: 2,
          totalCount: 5,
          hackerspaces: ["Hackerspace-1", "Hackerspace-2"],
        },
        {
          value: "category-1",
          hackerspaceCount: 1,
          totalCount: 10,
          hackerspaces: ["Hackerspace-1"],
        },
        {
          value: "category-3",
          hackerspaceCount: 1,
          totalCount: 1,
          hackerspaces: ["Hackerspace-2"],
        },
      ],
    });

    expect(markdown).toContain("# Categories By Hackerspace");
    expect(markdown).toContain("## Hackerspace-1 - 50 publications");
    expect(markdown).toContain("- `category-1` - 5/10 [Hackerspace-3]");
    expect(markdown).toContain("- `category-2` - 1/5 [Hackerspace-2]");
    expect(markdown).toContain("## Hackerspace-2 - 12 publications");
    expect(markdown).toContain("- `category-2` - 3/5 [Hackerspace-1]");
    expect(markdown).toContain("- `category-3` - 1/1");
    expect(markdown).toContain("## Categories By Reach");
    expect(markdown).toContain("- `category-2` - 2 (5) [Hackerspace-1, Hackerspace-2]");
    expect(markdown).toContain("- `category-1` - 1 (10) [Hackerspace-1]");
    expect(markdown).toContain("- `category-3` - 1 (1) [Hackerspace-2]");
  });
});

function response({ url, contentType, body, status = 200 }) {
  return createTextResponse({ url, contentType, body, status });
}
