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
