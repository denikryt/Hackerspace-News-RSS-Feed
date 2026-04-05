import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDir } from "../../_shared/tempDirs.js";

import { refreshCurated } from "../../../src/refreshCurated.js";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
});

describe("refreshCurated", () => {
  it("writes only the curated normalized snapshot from curated publications", async () => {
    const rootDir = await createTrackedTempDir("hnf-refresh-curated-only-", tempDirs);
    const paths = {
      curatedPublications: resolve(rootDir, "content/curated_publications.yml"),
      curatedNormalized: resolve(rootDir, "data/curated_publications_normalized.json"),
    };

    await writeText(
      paths.curatedPublications,
      `- feedUrl: https://blog.nachitima.com/feed/\n  guid: https://blog.nachitima.com/interview-with-sasha-hackerspace-stories\n`,
    );

    const fetchImpl = vi.fn(async (url) => {
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

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await refreshCurated({
      paths,
      fetchImpl,
      writeSnapshot: true,
    });

    expect(result.curatedPayload.items).toHaveLength(1);
    expect(result.curatedPayload.items[0]).toMatchObject({
      title: "Interview with Sasha",
      resolvedAuthor: "Nachitima",
    });
    expect(result.curatedPayload.unresolved).toEqual([]);

    const writtenPayload = JSON.parse(await readFile(paths.curatedNormalized, "utf8"));
    expect(writtenPayload).toMatchObject({
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

  it("by default fetches only curated entries that are missing from the existing snapshot and preserves saved ones", async () => {
    const rootDir = await createTrackedTempDir("hnf-refresh-curated-incremental-", tempDirs);
    const paths = {
      curatedPublications: resolve(rootDir, "content/curated_publications.yml"),
      curatedNormalized: resolve(rootDir, "data/curated_publications_normalized.json"),
    };

    await writeText(
      paths.curatedPublications,
      [
        "- feedUrl: https://blog.nachitima.com/feed/",
        "  guid: existing-guid",
        "- feedUrl: https://blog.nachitima.com/feed/",
        "  guid: new-guid",
      ].join("\n"),
    );

    await writeText(
      paths.curatedNormalized,
      `${JSON.stringify({
        items: [
          {
            guid: "existing-guid",
            title: "Existing item",
            feedUrl: "https://blog.nachitima.com/feed/",
            resolvedAuthor: "Saved Author",
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
      }, null, 2)}\n`,
    );

    const fetchImpl = vi.fn(async (url) => {
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
                  <title>Existing item from feed</title>
                  <guid>existing-guid</guid>
                  <link>https://blog.nachitima.com/existing</link>
                  <author>Feed Author</author>
                  <pubDate>Thu, 02 Jan 2025 10:00:00 GMT</pubDate>
                  <description>Old body</description>
                </item>
                <item>
                  <title>New item</title>
                  <guid>new-guid</guid>
                  <link>https://blog.nachitima.com/new</link>
                  <author>Nachitima</author>
                  <pubDate>Fri, 03 Jan 2025 10:00:00 GMT</pubDate>
                  <description>New body</description>
                </item>
              </channel>
            </rss>`,
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await refreshCurated({
      paths,
      fetchImpl,
      writeSnapshot: true,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.curatedPayload.items).toEqual([
      expect.objectContaining({
        guid: "existing-guid",
        title: "Existing item",
        resolvedAuthor: "Saved Author",
      }),
      expect.objectContaining({
        guid: "new-guid",
        title: "New item",
        resolvedAuthor: "Nachitima",
      }),
    ]);

    const writtenPayload = JSON.parse(await readFile(paths.curatedNormalized, "utf8"));
    expect(writtenPayload.items).toEqual([
      expect.objectContaining({
        guid: "existing-guid",
        title: "Existing item",
        resolvedAuthor: "Saved Author",
      }),
      expect.objectContaining({
        guid: "new-guid",
        title: "New item",
        resolvedAuthor: "Nachitima",
      }),
    ]);
  });

  it("force refresh rebuilds even already saved curated entries", async () => {
    const rootDir = await createTrackedTempDir("hnf-refresh-curated-force-", tempDirs);
    const paths = {
      curatedPublications: resolve(rootDir, "content/curated_publications.yml"),
      curatedNormalized: resolve(rootDir, "data/curated_publications_normalized.json"),
    };

    await writeText(
      paths.curatedPublications,
      "- feedUrl: https://blog.nachitima.com/feed/\n  guid: existing-guid\n",
    );

    await writeText(
      paths.curatedNormalized,
      `${JSON.stringify({
        items: [
          {
            guid: "existing-guid",
            title: "Existing item",
            feedUrl: "https://blog.nachitima.com/feed/",
            resolvedAuthor: "Saved Author",
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
      }, null, 2)}\n`,
    );

    const fetchImpl = vi.fn(async (url) => {
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
                  <title>Existing item refreshed</title>
                  <guid>existing-guid</guid>
                  <link>https://blog.nachitima.com/existing</link>
                  <author>Feed Author</author>
                  <pubDate>Thu, 02 Jan 2025 10:00:00 GMT</pubDate>
                  <description>Refreshed body</description>
                </item>
              </channel>
            </rss>`,
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await refreshCurated({
      paths,
      fetchImpl,
      writeSnapshot: true,
      force: true,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.curatedPayload.items).toEqual([
      expect.objectContaining({
        guid: "existing-guid",
        title: "Existing item refreshed",
        resolvedAuthor: "Feed Author",
      }),
    ]);
  });
});

async function writeText(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, value, "utf8");
}

function response({ url, body, contentType }) {
  return {
    ok: true,
    status: 200,
    url,
    headers: {
      get(name) {
        return name.toLowerCase() === "content-type" ? contentType : null;
      },
    },
    text: async () => body,
  };
}
