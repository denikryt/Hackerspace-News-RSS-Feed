import { describe, expect, it, vi } from "vitest";

import { runBuildCli } from "../src/cli/build.js";
import { runRefreshCli } from "../src/cli/refresh.js";

describe("refresh/build discovery-valid flag", () => {
  it("refresh keeps default behavior without the discovery-valid flag", async () => {
    const refreshImpl = vi.fn().mockResolvedValue({});
    const readJsonImpl = vi.fn();
    const logger = vi.fn();

    await runRefreshCli({
      argv: [],
      refreshImpl,
      readJsonImpl,
      logger,
      paths: {
        sourceRows: "/tmp/data/source_urls.json",
        validations: "/tmp/data/feed_validation.json",
        normalizedFeeds: "/tmp/data/feeds_normalized.json",
        discoveredValidSourceRows: "/tmp/content/discovered_valid_source_urls.json",
      },
    });

    expect(readJsonImpl).not.toHaveBeenCalled();
    expect(refreshImpl).toHaveBeenCalledWith({
      writeSnapshots: true,
      logger,
      additionalSourceRows: [],
    });
  });

  it("refresh loads discovery-valid rows only when the flag is present", async () => {
    const refreshImpl = vi.fn().mockResolvedValue({});
    const readJsonImpl = vi.fn().mockResolvedValue({
      urls: [
        {
          hackerspaceName: "Alpha",
          hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Alpha",
          country: "Wonderland",
          candidateFeedUrl: "https://alpha.example/feed.xml",
          sourceType: "discovery",
        },
      ],
    });
    const logger = vi.fn();
    const paths = {
      sourceRows: "/tmp/data/source_urls.json",
      validations: "/tmp/data/feed_validation.json",
      normalizedFeeds: "/tmp/data/feeds_normalized.json",
      discoveredValidSourceRows: "/tmp/content/discovered_valid_source_urls.json",
    };

    await runRefreshCli({
      argv: ["--include-discovery-valid"],
      refreshImpl,
      readJsonImpl,
      logger,
      paths,
    });

    expect(readJsonImpl).toHaveBeenCalledWith(paths.discoveredValidSourceRows);
    expect(refreshImpl).toHaveBeenCalledWith({
      writeSnapshots: true,
      logger,
      additionalSourceRows: [
        expect.objectContaining({
          hackerspaceName: "Alpha",
          candidateFeedUrl: "https://alpha.example/feed.xml",
        }),
      ],
    });
  });

  it("build passes the discovery-valid rows through to refresh when the flag is present", async () => {
    const refreshImpl = vi.fn().mockResolvedValue({
      sourceRowsPayload: {},
      validationsPayload: {},
      normalizedPayload: {},
    });
    const renderImpl = vi.fn().mockResolvedValue({ pages: { "index.html": "<html></html>" } });
    const readJsonImpl = vi.fn().mockResolvedValue({
      urls: [
        {
          hackerspaceName: "Alpha",
          hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Alpha",
          country: "Wonderland",
          candidateFeedUrl: "https://alpha.example/feed.xml",
          sourceType: "discovery",
        },
      ],
    });
    const logger = vi.fn();
    const paths = {
      sourceRows: "/tmp/data/source_urls.json",
      validations: "/tmp/data/feed_validation.json",
      normalizedFeeds: "/tmp/data/feeds_normalized.json",
      discoveredValidSourceRows: "/tmp/content/discovered_valid_source_urls.json",
    };

    await runBuildCli({
      argv: ["--include-discovery-valid"],
      refreshImpl,
      renderImpl,
      readJsonImpl,
      logger,
      paths,
      distDir: "/tmp/dist",
    });

    expect(readJsonImpl).toHaveBeenCalledWith(paths.discoveredValidSourceRows);
    expect(refreshImpl).toHaveBeenCalledWith({
      writeSnapshots: true,
      logger,
      additionalSourceRows: [
        expect.objectContaining({
          hackerspaceName: "Alpha",
          candidateFeedUrl: "https://alpha.example/feed.xml",
        }),
      ],
    });
    expect(renderImpl).toHaveBeenCalled();
  });
});
