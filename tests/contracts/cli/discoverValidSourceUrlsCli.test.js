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
            country: "Wonderland",
            feedUrl: "https://alpha.example/feed.xml",
          },
        ],
      },
    });
    const writeJsonImpl = vi.fn().mockResolvedValue(undefined);
    const paths = {
      discoveredHackerspaceFeeds: "/tmp/data/discovery/discovered_hackerspace_feeds.json",
      discoveredValidSourceRows: "/tmp/content/discovered_valid_source_urls.json",
    };

    await runDiscoverValidSourceUrlsCli({
      logger,
      readJsonImpl,
      writeJsonImpl,
      paths,
    });

    expect(readJsonImpl).toHaveBeenCalledWith(paths.discoveredHackerspaceFeeds);
    expect(writeJsonImpl).toHaveBeenCalledWith(
      paths.discoveredValidSourceRows,
      expect.objectContaining({
        urls: [
          expect.objectContaining({
            hackerspaceName: "Alpha",
            candidateFeedUrl: "https://alpha.example/feed.xml",
            sourceType: "discovery",
          }),
        ],
      }),
    );
    expect(logger).toHaveBeenCalledWith(`Wrote ${paths.discoveredValidSourceRows}`);
    expect(logger).toHaveBeenCalledWith("Discovery valid source list completed: valid=1");
  });
});
