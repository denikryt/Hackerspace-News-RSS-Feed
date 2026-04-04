import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDir } from "../../_shared/tempDirs.js";

import { renderCurated } from "../../../src/renderCurated.js";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
});

describe("renderCurated", () => {
  it("renders curated from local snapshots and replaces only the curated page", async () => {
    const rootDir = await createTrackedTempDir("hnf-render-curated-", tempDirs);
    const dataDir = resolve(rootDir, "data");
    const distDir = resolve(rootDir, "dist");
    const paths = {
      normalizedFeeds: resolve(dataDir, "feeds_normalized.json"),
      curatedNormalized: resolve(dataDir, "curated_publications_normalized.json"),
    };

    await writeJson(paths.normalizedFeeds, {
      generatedAt: "2026-04-05T00:00:00.000Z",
      sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
      summary: {
        sourceRows: 1,
        validFeeds: 1,
        parsedFeeds: 1,
        emptyFeeds: 0,
        failedFeeds: 0,
      },
      feeds: [
        {
          id: "row-1-alpha",
          rowNumber: 1,
          sourceWikiUrl: "https://wiki.hackerspaces.org/Alpha",
          finalFeedUrl: "https://alpha.example/feed.xml",
          siteUrl: "https://alpha.example",
          spaceName: "Alpha",
          country: "Wonderland",
          feedType: "rss",
          status: "parsed_ok",
          items: [],
        },
      ],
      failures: [],
    });
    await writeJson(paths.curatedNormalized, {
      items: [
        {
          id: "curated-1",
          guid: "guid-1",
          title: "Curated post",
          link: "https://alpha.example/post-1",
          resolvedAuthor: "Alice",
          authorSource: "author",
          publishedAt: "2025-01-03T10:00:00.000Z",
          summaryText: "Curated summary",
          feedUrl: "https://alpha.example/feed.xml",
          siteUrl: "https://alpha.example",
          spaceName: "Alpha",
          sourceWikiUrl: "https://wiki.hackerspaces.org/Alpha",
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
    });

    await writeText(resolve(distDir, "index.html"), "<html><body>Existing home</body></html>");
    await writeText(resolve(distDir, "feed/index.html"), "<html><body>Existing feed</body></html>");
    await writeText(resolve(distDir, "curated/index.html"), "<html><body>Old curated</body></html>");

    const result = await renderCurated({
      paths,
      distDir,
      now: Date.parse("2026-04-05T12:00:00.000Z"),
      writePages: true,
    });

    expect(Object.keys(result.pages)).toEqual(["curated/index.html"]);
    expect(result.normalizedPayload.curated.items).toHaveLength(1);

    const curatedHtml = await readFile(resolve(distDir, "curated/index.html"), "utf8");
    expect(curatedHtml).toContain("Curated");
    expect(curatedHtml).toContain("Curated post");
    expect(curatedHtml).toContain("Alice");
    expect(await readFile(resolve(distDir, "index.html"), "utf8")).toContain("Existing home");
    expect(await readFile(resolve(distDir, "feed/index.html"), "utf8")).toContain("Existing feed");
    await access(resolve(distDir, "favicon.png"));
  });
});

async function writeJson(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, value, "utf8");
}
