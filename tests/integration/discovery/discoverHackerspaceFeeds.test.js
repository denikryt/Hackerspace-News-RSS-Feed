import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { readFixtureText } from "../../_shared/paths.js";
import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDir } from "../../_shared/tempDirs.js";

import { discoverFeedForSite, discoverHackerspaceFeeds } from "../../../src/discoverHackerspaceFeeds.js";

const sourceHtml = readFixtureText("source-page", "list-of-hackerspaces-websites-snippet.html");
const sourcePageUrl = "https://wiki.hackerspaces.org/List_of_Hacker_Spaces";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
});

describe("discoverFeedForSite", () => {
  it("skips known social-host sites without making network requests", async () => {
    const fetchImpl = vi.fn();

    const [telegramResult, facebookResult] = await Promise.all([
      discoverFeedForSite({
        site: { siteUrl: "https://t.me/sandbox_events", hackerspaceName: "Sandbox" },
        fetchImpl,
        waitImpl: vi.fn().mockResolvedValue(undefined),
      }),
      discoverFeedForSite({
        site: { siteUrl: "https://www.facebook.com/example.space", hackerspaceName: "Example Space" },
        fetchImpl,
        waitImpl: vi.fn().mockResolvedValue(undefined),
      }),
    ]);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(telegramResult).toMatchObject({
      siteUrl: "https://t.me/sandbox_events",
      status: "skipped",
      validationStatus: "not_checked",
    });
    expect(facebookResult).toMatchObject({
      siteUrl: "https://www.facebook.com/example.space",
      status: "skipped",
      validationStatus: "not_checked",
    });
  });

  it("marks alternate-link feeds with items as valid", async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url === "https://alpha.example/") {
        return htmlResponse(
          url,
          '<html><head><link rel="alternate" type="application/rss+xml" href="/feed.xml"></head><body>ok</body></html>',
        );
      }

      if (url === "https://alpha.example/feed.xml") {
        return feedResponse(
          url,
          `<?xml version="1.0"?><rss version="2.0"><channel><title>Alpha</title><link>https://alpha.example/</link><description>Alpha feed</description><item><title>One</title><link>https://alpha.example/post-1</link></item></channel></rss>`,
        );
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await discoverFeedForSite({
      site: {
        siteUrl: "https://alpha.example/",
        hackerspaceName: "Alpha",
        hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Alpha",
        country: "Wonderland",
      },
      fetchImpl,
      waitImpl: vi.fn().mockResolvedValue(undefined),
    });

    expect(result).toMatchObject({
      siteUrl: "https://alpha.example/",
      hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Alpha",
      country: "Wonderland",
      feedUrl: "https://alpha.example/feed.xml",
      discoveryMethod: "alternate_link",
      status: "confirmed",
      validationStatus: "valid",
    });
  });

  it("marks parseable feeds without items as empty", async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url === "https://beta.example/") {
        return htmlResponse(url, "<html><body>no alternate</body></html>");
      }

      if (url === "https://beta.example/feed") {
        return feedResponse(
          url,
          `<?xml version="1.0"?><rss version="2.0"><channel><title>Beta</title><link>https://beta.example/</link><description>Beta feed</description></channel></rss>`,
        );
      }

      return notFoundResponse(url);
    });

    const result = await discoverFeedForSite({
      site: { siteUrl: "https://beta.example/", hackerspaceName: "Beta" },
      fetchImpl,
      waitImpl: vi.fn().mockResolvedValue(undefined),
    });

    expect(result).toMatchObject({
      siteUrl: "https://beta.example/",
      feedUrl: "https://beta.example/feed",
      discoveryMethod: "fallback_path",
      status: "confirmed",
      validationStatus: "empty",
    });
  });

  it("retries each discovery candidate endpoint twice and still waits 1s between different candidates", async () => {
    const waitImpl = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = vi.fn(async (url) => {
      if (url === "https://theta.example/") {
        return htmlResponse(url, "<html><body>no alternate</body></html>");
      }

      if (url === "https://theta.example/feed") {
        throw fetchFailed({ code: "ETIMEDOUT" });
      }

      if (url === "https://theta.example/feed/") {
        return feedResponse(
          url,
          `<?xml version="1.0"?><rss version="2.0"><channel><title>Theta</title><link>https://theta.example/</link><description>Theta feed</description><item><title>One</title><link>https://theta.example/post-1</link></item></channel></rss>`,
        );
      }

      return notFoundResponse(url);
    });

    const result = await discoverFeedForSite({
      site: { siteUrl: "https://theta.example/", hackerspaceName: "Theta" },
      fetchImpl,
      waitImpl,
    });

    expect(result).toMatchObject({
      feedUrl: "https://theta.example/feed/",
      discoveryMethod: "fallback_path",
      status: "confirmed",
      validationStatus: "valid",
    });
    expect(fetchImpl.mock.calls.filter(([url]) => url === "https://theta.example/feed")).toHaveLength(2);
    expect(fetchImpl.mock.calls.filter(([url]) => url === "https://theta.example/feed/")).toHaveLength(1);
    expect(waitImpl).toHaveBeenCalledWith(2000);
    expect(waitImpl).toHaveBeenCalledWith(1000);
  });

  it("marks responding non-feed endpoints as invalid", async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url === "https://gamma.example/") {
        return htmlResponse(url, "<html><body>no alternate</body></html>");
      }

      if (url === "https://gamma.example/feed") {
        return htmlResponse(url, "<html><body>not a feed</body></html>");
      }

      return notFoundResponse(url);
    });

    const result = await discoverFeedForSite({
      site: { siteUrl: "https://gamma.example/", hackerspaceName: "Gamma" },
      fetchImpl,
      waitImpl: vi.fn().mockResolvedValue(undefined),
    });

    expect(result).toMatchObject({
      siteUrl: "https://gamma.example/",
      discoveryMethod: "fallback_path",
      status: "confirmed",
      validationStatus: "invalid",
      validationNote: "non_xml_response",
    });
    expect(result).not.toHaveProperty("feedUrl");
  });

  it("marks unreachable alternate-link endpoints separately from not_found", async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url === "https://epsilon.example/") {
        return htmlResponse(
          url,
          '<html><head><link rel="alternate" type="application/rss+xml" href="/feed.xml"></head><body>ok</body></html>',
        );
      }

      if (url === "https://epsilon.example/feed.xml") {
        return {
          ok: false,
          status: 503,
          url,
          headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
          text: () => Promise.resolve("<html><body>bad gateway</body></html>"),
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await discoverFeedForSite({
      site: { siteUrl: "https://epsilon.example/", hackerspaceName: "Epsilon" },
      fetchImpl,
      waitImpl: vi.fn().mockResolvedValue(undefined),
    });

    expect(result).toMatchObject({
      siteUrl: "https://epsilon.example/",
      feedUrl: "https://epsilon.example/feed.xml",
      discoveryMethod: "alternate_link",
      status: "confirmed",
      validationStatus: "unreachable",
    });
  });

  it("marks homepage fetch failures as failed", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      url: "https://delta.example/",
      headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
      text: () => Promise.resolve("bad"),
    });

    const result = await discoverFeedForSite({
      site: { siteUrl: "https://delta.example/", hackerspaceName: "Delta" },
      fetchImpl,
      waitImpl: vi.fn().mockResolvedValue(undefined),
    });

    expect(result).toMatchObject({
      siteUrl: "https://delta.example/",
      status: "failed",
      validationStatus: "not_checked",
    });
  });
});

describe("discoverHackerspaceFeeds", () => {
  it("writes a grouped json registry with valid and invalid results separated", async () => {
    const outputDir = await createTrackedTempDir("hnf-discovery-", tempDirs);

    const paths = {
      discoveredHackerspaceSourceSnapshot: resolve(outputDir, "data/discovery/list_of_hacker_spaces.html"),
      discoveredHackerspaceFeeds: resolve(outputDir, "data/discovery/discovered_hackerspace_feeds.json"),
    };
    const logger = vi.fn();

    const fetchImpl = vi.fn(async (url) => {
      if (url === sourcePageUrl) {
        return htmlResponse(url, sourceHtml);
      }

      if (url === "http://www.synergymill.com/") {
        return htmlResponse(
          url,
          '<html><head><link rel="alternate" type="application/rss+xml" href="/feed.xml"></head><body>ok</body></html>',
        );
      }

      if (url === "http://www.synergymill.com/feed.xml") {
        return feedResponse(
          url,
          `<?xml version="1.0"?><rss version="2.0"><channel><title>Synergy Mill</title><link>http://www.synergymill.com/</link><description>Synergy Mill feed</description><item><title>One</title><link>http://www.synergymill.com/post-1</link></item></channel></rss>`,
        );
      }

      if (url === "https://www.chaoschemnitz.de/") {
        return htmlResponse(url, "<html><body>no alternate</body></html>");
      }

      if (url === "https://www.chaoschemnitz.de/feed") {
        return feedResponse(
          url,
          `<?xml version="1.0"?><rss version="2.0"><channel><title>Chaos Computer Club Chemnitz</title><link>https://www.chaoschemnitz.de/</link><description>CCC Chemnitz feed</description></channel></rss>`,
        );
      }

      return notFoundResponse(url);
    });

    const result = await discoverHackerspaceFeeds({
      sourcePageUrl,
      fetchImpl,
      paths,
      writeOutput: true,
      logger,
      waitImpl: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.discoveryPayload.entries).toHaveLength(4);
    expect(result.discoveryPayload.summary).toMatchObject({
      sites: 4,
      confirmed: 2,
      valid: 1,
      empty: 1,
      failed: 2,
    });

    const [snapshotHtml, discoveryJson] = await Promise.all([
      readFile(paths.discoveredHackerspaceSourceSnapshot, "utf8"),
      readFile(paths.discoveredHackerspaceFeeds, "utf8"),
    ]);
    const grouped = JSON.parse(discoveryJson);

    expect(snapshotHtml).toBe(sourceHtml);
    expect(grouped.summary).toMatchObject({
      sites: 4,
      confirmed: 2,
      valid: 1,
      empty: 1,
      failed: 2,
    });
    expect(grouped.groupedByValidationStatus.valid).toEqual([
      expect.objectContaining({
        siteUrl: "http://www.synergymill.com/",
        hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Synergy_Mill",
        country: "US",
      }),
    ]);
    expect(grouped.groupedByValidationStatus.empty).toEqual([
      expect.objectContaining({ siteUrl: "https://www.chaoschemnitz.de/" }),
    ]);
    expect(grouped.groupedByValidationStatus.not_checked).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ siteUrl: "http://ilmspace.de/", status: "failed" }),
        expect.objectContaining({ siteUrl: "https://c3d2.de/", status: "failed" }),
      ]),
    );

    const logLines = logger.mock.calls.map(([line]) => line);
    expect(logLines).toContain(`[discover] fetching source page: ${sourcePageUrl}`);
    expect(logLines).toContain(`[discover] wrote source snapshot: ${paths.discoveredHackerspaceSourceSnapshot}`);
    expect(logLines).toContain("[discover] website rows extracted: 4");
    expect(logLines).toContain("[discover] starting site 1/4: http://www.synergymill.com/");
    expect(logLines).toContain("[discover] completed site 1/4: http://www.synergymill.com/ (confirmed/valid)");
    expect(logLines).toContain("[discover] starting site 4/4: https://c3d2.de/");
    expect(logLines).toContain("[discover] completed site 4/4: https://c3d2.de/ (failed/not_checked)");
  });

  it("records social-host rows as skipped without fetching them", async () => {
    const logger = vi.fn();
    const socialOnlyHtml = `
      <table>
        <tr><th>hackerspace</th><th>Country</th><th>Website</th></tr>
        <tr data-row-number="1">
          <td><a href="/Sandbox">Sandbox</a></td>
          <td>Israel</td>
          <td><a href="https://t.me/sandbox_events">https://t.me/sandbox_events</a></td>
        </tr>
        <tr data-row-number="2">
          <td><a href="/Sugar_Shack">Sugar Shack</a></td>
          <td>United States of America</td>
          <td><a href="http://www.twitter.com/sugarshack">http://www.twitter.com/sugarshack</a></td>
        </tr>
      </table>
    `;
    const fetchImpl = vi.fn(async (url) => {
      if (url === sourcePageUrl) {
        return htmlResponse(url, socialOnlyHtml);
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await discoverHackerspaceFeeds({
      sourcePageUrl,
      fetchImpl,
      logger,
      waitImpl: vi.fn().mockResolvedValue(undefined),
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.discoveryPayload.entries).toEqual([
      expect.objectContaining({
        siteUrl: "https://t.me/sandbox_events",
        status: "skipped",
        validationStatus: "not_checked",
      }),
      expect.objectContaining({
        siteUrl: "http://www.twitter.com/sugarshack",
        status: "skipped",
        validationStatus: "not_checked",
      }),
    ]);
    expect(result.discoveryPayload.summary).toMatchObject({
      sites: 2,
      skipped: 2,
      confirmed: 0,
      failed: 0,
    });

    const logLines = logger.mock.calls.map(([line]) => line);
    expect(logLines).toContain("[discover] completed site 1/2: https://t.me/sandbox_events (skipped/not_checked)");
    expect(logLines).toContain("[discover] completed site 2/2: http://www.twitter.com/sugarshack (skipped/not_checked)");
  });

  it("updates the discovered feeds file incrementally while the crawl is running", async () => {
    const outputDir = await createTrackedTempDir("hnf-discovery-progress-", tempDirs);

    const paths = {
      discoveredHackerspaceSourceSnapshot: resolve(outputDir, "data/discovery/list_of_hacker_spaces.html"),
      discoveredHackerspaceFeeds: resolve(outputDir, "data/discovery/discovered_hackerspace_feeds.json"),
    };
    const socialOnlyHtml = `
      <table>
        <tr><th>hackerspace</th><th>Country</th><th>Website</th></tr>
        <tr data-row-number="1">
          <td><a href="/Sandbox">Sandbox</a></td>
          <td>Israel</td>
          <td><a href="https://t.me/sandbox_events">https://t.me/sandbox_events</a></td>
        </tr>
        <tr data-row-number="2">
          <td><a href="/Sugar_Shack">Sugar Shack</a></td>
          <td>United States of America</td>
          <td><a href="http://www.twitter.com/sugarshack">http://www.twitter.com/sugarshack</a></td>
        </tr>
      </table>
    `;
    const writes = [];
    const writeTextImpl = vi.fn(async (filePath, value) => {
      writes.push({ filePath, value });
    });
    const fetchImpl = vi.fn(async (url) => {
      if (url === sourcePageUrl) {
        return htmlResponse(url, socialOnlyHtml);
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    await discoverHackerspaceFeeds({
      sourcePageUrl,
      fetchImpl,
      paths,
      writeOutput: true,
      writeTextImpl,
      requestConcurrency: 1,
      waitImpl: vi.fn().mockResolvedValue(undefined),
    });

    const discoveryWrites = writes.filter(({ filePath }) => filePath === paths.discoveredHackerspaceFeeds);
    expect(discoveryWrites).toHaveLength(2);
    const firstWrite = JSON.parse(discoveryWrites[0].value);
    const secondWrite = JSON.parse(discoveryWrites[1].value);
    expect(firstWrite.groupedByValidationStatus.not_checked).toEqual([
      expect.objectContaining({ siteUrl: "https://t.me/sandbox_events" }),
    ]);
    expect(secondWrite.groupedByValidationStatus.not_checked).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ siteUrl: "https://t.me/sandbox_events" }),
        expect.objectContaining({ siteUrl: "http://www.twitter.com/sugarshack" }),
      ]),
    );
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

function fetchFailed({ code }) {
  return Object.assign(new TypeError("fetch failed"), {
    cause: Object.assign(new Error(code), { code }),
  });
}
