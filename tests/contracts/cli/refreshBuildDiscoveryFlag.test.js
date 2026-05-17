import { describe, expect, it, vi } from "vitest";

import { runBuildCli } from "../../../src/cli/build.js";
import { runRefreshCli } from "../../../src/cli/refresh.js";

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
        curatedNormalized: "/tmp/data/curated_publications_normalized.json",
        discoveredValidSourceRows: "/tmp/content/discovered_valid_source_urls.json",
      },
    });

    expect(readJsonImpl).not.toHaveBeenCalled();
    expect(refreshImpl).toHaveBeenCalledWith({
      writeSnapshots: true,
      logger,
      additionalSourceRows: [],
      refreshCalendarOnly: false,
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
      curatedNormalized: "/tmp/data/curated_publications_normalized.json",
      calendarSources: "/tmp/content/ics_events.json",
      curatedNormalized: "/tmp/data/curated_publications_normalized.json",
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
      refreshCalendarOnly: false,
    });
  });

  it("refresh runs only the calendar pipeline when the calendar flag is present", async () => {
    const refreshImpl = vi.fn().mockResolvedValue({});
    const readJsonImpl = vi.fn();
    const logger = vi.fn();
    const paths = {
      sourceRows: "/tmp/data/source_urls.json",
      validations: "/tmp/data/feed_validation.json",
      normalizedFeeds: "/tmp/data/feeds_normalized.json",
      calendarSources: "/tmp/content/ics_events.json",
      calendarEvents: "/tmp/data/calendar/events.json",
      discoveredValidSourceRows: "/tmp/content/discovered_valid_source_urls.json",
    };

    await runRefreshCli({
      argv: ["--calendar"],
      refreshImpl,
      readJsonImpl,
      logger,
      paths,
    });

    expect(readJsonImpl).not.toHaveBeenCalled();
    expect(refreshImpl).toHaveBeenCalledWith({
      writeSnapshots: true,
      logger,
      additionalSourceRows: [],
      refreshCalendarOnly: true,
    });
    expect(logger).toHaveBeenCalledWith("Refresh completed. Reporting snapshot artifacts.");
    expect(logger).toHaveBeenCalledWith(`Wrote ${paths.calendarSources}`);
    expect(logger).toHaveBeenCalledWith(`Wrote ${paths.calendarEvents}`);
    expect(logger).not.toHaveBeenCalledWith(`Wrote ${paths.sourceRows}`);
    expect(logger).not.toHaveBeenCalledWith(`Wrote ${paths.validations}`);
    expect(logger).not.toHaveBeenCalledWith(`Wrote ${paths.normalizedFeeds}`);
  });

  it("refresh also treats npm_config_calendar as the calendar flag", async () => {
    const refreshImpl = vi.fn().mockResolvedValue({});
    const logger = vi.fn();

    await runRefreshCli({
      argv: [],
      refreshImpl,
      logger,
      env: {
        npm_config_calendar: "true",
      },
      paths: {
        sourceRows: "/tmp/data/source_urls.json",
        validations: "/tmp/data/feed_validation.json",
        normalizedFeeds: "/tmp/data/feeds_normalized.json",
        calendarSources: "/tmp/content/ics_events.json",
        calendarEvents: "/tmp/data/calendar/events.json",
        discoveredValidSourceRows: "/tmp/content/discovered_valid_source_urls.json",
      },
    });

    expect(refreshImpl).toHaveBeenCalledWith({
      writeSnapshots: true,
      logger,
      additionalSourceRows: [],
      refreshCalendarOnly: true,
    });
  });

  it("build passes the discovery-valid rows through to refresh when the flag is present", async () => {
    const refreshImpl = vi.fn().mockResolvedValue({
      sourceRowsPayload: {},
      validationsPayload: {},
      normalizedPayload: {},
      curatedPayload: { items: ["from-refresh"] },
    });
    const refreshCuratedImpl = vi.fn().mockResolvedValue({
      curatedPayload: { items: ["from-curated-refresh"] },
      outputPath: "/tmp/data/curated_publications_normalized.json",
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
      curatedNormalized: "/tmp/data/curated_publications_normalized.json",
      discoveredValidSourceRows: "/tmp/content/discovered_valid_source_urls.json",
    };

    await runBuildCli({
      argv: ["--include-discovery-valid"],
      refreshImpl,
      refreshCuratedImpl,
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
    expect(refreshCuratedImpl).toHaveBeenCalledWith({
      logger,
      writeSnapshot: true,
      force: false,
    });
    expect(renderImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        curatedPayload: { items: ["from-curated-refresh"] },
      }),
    );
  });
});
