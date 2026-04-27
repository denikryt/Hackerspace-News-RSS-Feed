import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDir } from "../../_shared/tempDirs.js";

import { runDiscoverFeedsIncrementalCli } from "../../../src/cli/discoverFeedsIncremental.js";

const sourcePageUrl = "https://wiki.hackerspaces.org/List_of_Hacker_Spaces";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
});

// Two-site HTML used across tests — Alpha already known, Beta is new.
const twoSiteHtml = `
  <table>
    <tr><th>hackerspace</th><th>Country</th><th>Website</th></tr>
    <tr data-row-number="1">
      <td><a href="/Alpha">Alpha</a></td>
      <td>Wonderland</td>
      <td><a href="https://alpha.example/">https://alpha.example/</a></td>
    </tr>
    <tr data-row-number="2">
      <td><a href="/Beta">Beta</a></td>
      <td>Nowhere</td>
      <td><a href="https://beta.example/">https://beta.example/</a></td>
    </tr>
  </table>
`;

const existingValidSourceList = {
  sourcePageUrl,
  extractedAt: "2026-01-01T00:00:00.000Z",
  urls: [
    {
      hackerspaceName: "Alpha",
      hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Alpha",
      country: "Wonderland",
      siteUrl: "https://alpha.example/",
      candidateFeedUrl: "https://alpha.example/feed.xml",
      sourceType: "discovery",
    },
  ],
};

// Audit payload mirrors what discover:feeds writes — used as the source of knownSiteUrls.
const existingAuditPayload = {
  sourcePageUrl,
  generatedAt: "2026-01-01T00:00:00.000Z",
  groupedByValidationStatus: {
    valid: [
      {
        hackerspaceName: "Alpha",
        hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Alpha",
        country: "Wonderland",
        siteUrl: "https://alpha.example/",
        feedUrl: "https://alpha.example/feed.xml",
        discoveryMethod: "alternate_link",
        status: "confirmed",
        validationStatus: "valid",
      },
    ],
  },
};

describe("runDiscoverFeedsIncrementalCli", () => {
  it("skips already-known sites and appends newly discovered valid feeds", async () => {
    const outputDir = await createTrackedTempDir("hnf-incremental-", tempDirs);
    const paths = {
      discoveredHackerspaceSourceSnapshot: resolve(outputDir, "data/discovery/list_of_hacker_spaces.html"),
      discoveredHackerspaceFeeds: resolve(outputDir, "data/discovery/discovered_hackerspace_feeds.json"),
      discoveredValidSourceRows: resolve(outputDir, "content/discovered_valid_source_urls.json"),
    };

    const fetchImpl = vi.fn(async (url) => {
      if (url === sourcePageUrl) return htmlResponse(url, twoSiteHtml);
      if (url === "https://beta.example/") {
        return htmlResponse(
          url,
          '<html><head><link rel="alternate" type="application/rss+xml" href="/rss.xml"></head><body>ok</body></html>',
        );
      }
      if (url === "https://beta.example/rss.xml") {
        return feedResponse(
          url,
          `<?xml version="1.0"?><rss version="2.0"><channel><title>Beta</title><link>https://beta.example/</link><description>Beta feed</description><item><title>One</title><link>https://beta.example/post-1</link></item></channel></rss>`,
        );
      }
      return notFoundResponse(url);
    });

    const result = await runDiscoverFeedsIncrementalCli({
      paths,
      fetchImpl,
      waitImpl: vi.fn().mockResolvedValue(undefined),
      existingValidSourceRows: existingValidSourceList,
      existingAuditPayload,
      logger: vi.fn(),
    });

    // Alpha was not fetched — only the source page and Beta were.
    const fetchedUrls = fetchImpl.mock.calls.map(([url]) => url);
    expect(fetchedUrls).not.toContain("https://alpha.example/");
    expect(fetchedUrls).toContain("https://beta.example/");

    // Output contains both Alpha (preserved) and Beta (newly found).
    expect(result.mergedUrls).toHaveLength(2);
    expect(result.mergedUrls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ siteUrl: "https://alpha.example/" }),
        expect.objectContaining({ siteUrl: "https://beta.example/" }),
      ]),
    );

    // No duplicates.
    const siteUrls = result.mergedUrls.map((u) => u.siteUrl);
    expect(new Set(siteUrls).size).toBe(siteUrls.length);
  });

  it("behaves like a full scan when no existing valid source list is provided", async () => {
    const outputDir = await createTrackedTempDir("hnf-incremental-fresh-", tempDirs);
    const paths = {
      discoveredHackerspaceSourceSnapshot: resolve(outputDir, "data/discovery/list_of_hacker_spaces.html"),
      discoveredHackerspaceFeeds: resolve(outputDir, "data/discovery/discovered_hackerspace_feeds.json"),
      discoveredValidSourceRows: resolve(outputDir, "content/discovered_valid_source_urls.json"),
    };

    const fetchImpl = vi.fn(async (url) => {
      if (url === sourcePageUrl) return htmlResponse(url, twoSiteHtml);
      if (url === "https://alpha.example/") return htmlResponse(url, "<html><body>no alternate</body></html>");
      if (url === "https://beta.example/") return htmlResponse(url, "<html><body>no alternate</body></html>");
      return notFoundResponse(url);
    });

    const result = await runDiscoverFeedsIncrementalCli({
      paths,
      fetchImpl,
      waitImpl: vi.fn().mockResolvedValue(undefined),
      existingValidSourceRows: null,
      logger: vi.fn(),
    });

    // Both sites processed — no skips.
    const fetchedUrls = fetchImpl.mock.calls.map(([url]) => url);
    expect(fetchedUrls).toContain("https://alpha.example/");
    expect(fetchedUrls).toContain("https://beta.example/");

    // Neither site produced a valid feed here, so merged list is empty.
    expect(result.mergedUrls).toEqual([]);
  });
});

function htmlResponse(url, body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
    text: () => Promise.resolve(body),
  };
}

function feedResponse(url, body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: new Headers({ "content-type": "application/rss+xml; charset=utf-8" }),
    text: () => Promise.resolve(body),
  };
}

function notFoundResponse(url) {
  return htmlResponse(url, "<html><body>not found</body></html>", 404);
}
