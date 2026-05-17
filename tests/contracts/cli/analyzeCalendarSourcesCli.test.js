import { describe, expect, it, vi } from "vitest";

import { runAnalyzeCalendarSourcesCli } from "../../../src/cli/analyzeCalendarSources.js";

describe("analyze calendar sources CLI", () => {
  it("prints help without running the analyzer", async () => {
    const logger = vi.fn();
    const analyzeImpl = vi.fn();

    await runAnalyzeCalendarSourcesCli({
      argv: ["--help"],
      logger,
      analyzeImpl,
    });

    expect(analyzeImpl).not.toHaveBeenCalled();
    expect(logger).toHaveBeenCalledWith("Usage: npm run analyze:calendar-sources");
  });

  it("analyzes sources from ics_events.json and writes both json and markdown artifacts", async () => {
    const logger = vi.fn();
    const analyzeImpl = vi.fn().mockResolvedValue({
      generatedAt: "2026-05-16T14:00:00.000Z",
      summary: {
        totalSources: 2,
        parsedSources: 1,
        failedSources: 1,
        totalEvents: 10,
      },
      dtstartEncodings: {
        utc: 7,
        zoned: 2,
        date: 1,
        floating: 0,
      },
      propertyPresence: [
        { name: "DTSTART", count: 10 },
      ],
      timeZones: [],
      sourceResults: [],
    });
    const writeJsonImpl = vi.fn().mockResolvedValue(undefined);
    const writeTextImpl = vi.fn().mockResolvedValue(undefined);

    await runAnalyzeCalendarSourcesCli({
      logger,
      analyzeImpl,
      writeJsonImpl,
      writeTextImpl,
      artifactPaths: {
        jsonReport: "/tmp/analysis/calendar_source_inventory.json",
        markdownReport: "/tmp/analysis/calendar_source_inventory.md",
      },
      paths: {
        calendarSources: "/tmp/content/ics_events.json",
      },
    });

    expect(analyzeImpl).toHaveBeenCalledWith({
      calendarSourcesPath: "/tmp/content/ics_events.json",
      fetchImpl: fetch,
      readJsonImpl: expect.any(Function),
      logger,
    });
    expect(writeJsonImpl).toHaveBeenCalledWith(
      "/tmp/analysis/calendar_source_inventory.json",
      expect.objectContaining({
        summary: expect.objectContaining({
          totalSources: 2,
          totalEvents: 10,
        }),
      }),
    );
    expect(writeTextImpl).toHaveBeenCalledWith(
      "/tmp/analysis/calendar_source_inventory.md",
      expect.stringContaining("Calendar Source Inventory"),
    );
    expect(logger).toHaveBeenCalledWith("[analyze] starting calendar source analysis");
    expect(logger).toHaveBeenCalledWith("[analyze] writing calendar source analysis artifacts");
    expect(logger).toHaveBeenCalledWith("[analyze] analyzed 2 calendar sources");
    expect(logger).toHaveBeenCalledWith("[analyze] parsed 10 calendar events");
    expect(logger).toHaveBeenCalledWith("[analyze] wrote /tmp/analysis/calendar_source_inventory.json");
    expect(logger).toHaveBeenCalledWith("[analyze] wrote /tmp/analysis/calendar_source_inventory.md");
  });
});
