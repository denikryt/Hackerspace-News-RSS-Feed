import { describe, expect, it, vi } from "vitest";

import { runDiscoverValidSourceUrlsCli } from "../../../src/cli/discoverValidSourceUrls.js";

describe("runDiscoverValidSourceUrlsCli", () => {
  it("reads the audit artifact, writes the clean valid source file, and logs a short summary", async () => {
    const logger = vi.fn();
    const readJsonImpl = vi.fn().mockResolvedValue({
      generatedAt: "2026-03-30T12:00:00.000Z",
      sourcePageUrl: "https://wiki.hackerspaces.org/List_of_Hacker_Spaces",
      groupedByValidationStatus: {
        valid: [
          {
            hackerspaceName: "Alpha",
            hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Alpha",
            feedUrl: "https://alpha.example/feed.xml",
            siteUrl: "https://alpha.example/",
            country: "France",
          },
        ],
      },
    });
    const writeJsonImpl = vi.fn().mockResolvedValue(undefined);
    const readAudit = readJsonImpl.getMockImplementation();
    readJsonImpl.mockImplementation(path => path.endsWith("rss_feeds.json") ? { items: [] } : readAudit());
    const paths = {
      discoveredHackerspaceFeeds: "/tmp/data/discovery/discovered_hackerspace_feeds.json",
      rssFeeds: "/tmp/content/rss_feeds.json",
    };

    await runDiscoverValidSourceUrlsCli({
      logger,
      readJsonImpl,
      writeJsonImpl,
      paths,
    });

    expect(readJsonImpl).toHaveBeenCalledWith(paths.discoveredHackerspaceFeeds);
    expect(writeJsonImpl).toHaveBeenCalledWith(
      paths.rssFeeds,
      expect.objectContaining({
        items: [
          expect.objectContaining({
            hackerspaceName: "Alpha",
            feedUrl: "https://alpha.example/feed.xml",
          }),
        ],
      }),
    );
    expect(logger).toHaveBeenCalledWith(`Wrote ${paths.rssFeeds}`);
    expect(logger).toHaveBeenCalledWith("Discovery valid source list completed: valid=1");
  });
});
