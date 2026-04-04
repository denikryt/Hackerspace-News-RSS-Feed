import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDir } from "../../_shared/tempDirs.js";

import { renderCuratedPreview } from "../../../src/curatedPreview.js";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
});

describe("renderCuratedPreview", () => {
  it("renders curated into the main dist dir and replaces only the curated page", async () => {
    const rootDir = await createTrackedTempDir("hnf-curated-preview-", tempDirs);
    const curatedPath = resolve(rootDir, "content/curated_publications.yml");
    const distDir = resolve(rootDir, "dist");

    await writeText(
      curatedPath,
      `- feedUrl: https://blog.nachitima.com/feed/\n  guid: https://blog.nachitima.com/interview-with-sasha-hackerspace-stories\n`,
    );
    await writeText(resolve(distDir, "index.html"), "<html><body>Existing home</body></html>");
    await writeText(resolve(distDir, "feed/index.html"), "<html><body>Existing feed</body></html>");
    await writeText(resolve(distDir, "curated/index.html"), "<html><body>Old curated</body></html>");

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

    const result = await renderCuratedPreview({
      fetchImpl,
      curatedPublicationsPath: curatedPath,
      distDir,
      writePages: true,
    });

    expect(result.resolvedCount).toBe(1);
    expect(result.unresolvedCount).toBe(0);
    expect(Object.keys(result.pages)).toEqual(["curated/index.html"]);

    const curatedHtml = await readFile(resolve(distDir, "curated/index.html"), "utf8");
    expect(curatedHtml).toContain("Curated");
    expect(curatedHtml).toContain("Interview with Sasha");
    expect(curatedHtml).toContain("Nachitima");

    expect(await readFile(resolve(distDir, "index.html"), "utf8")).toContain("Existing home");
    expect(await readFile(resolve(distDir, "feed/index.html"), "utf8")).toContain("Existing feed");
    await access(resolve(distDir, "favicon.png"));
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
