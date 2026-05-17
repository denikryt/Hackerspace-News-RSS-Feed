import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDir } from "../_shared/tempDirs.js";
import { formatDateKeyInTimeZone, shiftMonthKey } from "../../src/calendar/dateFormatting.js";
import {
  buildCalendarIndex,
  buildCalendarPageModel,
  readCalendarEvents,
  refreshCalendarSnapshot,
} from "../../src/calendar/index.js";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
});

describe("calendar module", () => {
  it("formats client-visible date keys as stable ISO dates", () => {
    expect(formatDateKeyInTimeZone("2026-02-03T03:00:00.000Z", "America/Los_Angeles")).toBe("2026-02-02");
    expect(formatDateKeyInTimeZone("2026-02-03T03:00:00.000Z", "UTC")).toBe("2026-02-03");
  });

  it("shifts month keys predictably for calendar navigation", () => {
    expect(shiftMonthKey("2026-02", 1)).toBe("2026-03");
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
  });

  it("reads ICS files from a directory and preserves observed event fields", async () => {
    const rootDir = await createTrackedTempDir("calendar-ics-", tempDirs);
    const calendarDir = resolve(rootDir, "ICS");
    await mkdir(calendarDir, { recursive: true });
    await writeFile(resolve(calendarDir, "sample.ics"), `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event-1
SUMMARY:Open Night
DTSTART;TZID=America/Los_Angeles:20260514T193000
DTEND;TZID=America/Los_Angeles:20260514T220000
DESCRIPTION:Line one\\nLine two
LOCATION:Noisebridge\\, San Francisco
URL:https://example.com/events/open-night
CATEGORIES:Event\\,Event,Security
ORGANIZER:mailto:Noisebridge
END:VEVENT
END:VCALENDAR`, "utf8");

    const events = await readCalendarEvents({ directoryPath: calendarDir });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      sourceFile: "sample.ics",
      uid: "event-1",
      summary: "Open Night",
      dateKind: "timed",
      sourceTimeZone: "America/Los_Angeles",
      location: "Noisebridge, San Francisco",
      url: "https://example.com/events/open-night",
      organizer: "mailto:Noisebridge",
    });
    expect(events[0].description).toContain("Line one");
    expect(events[0].description).toContain("Line two");
    expect(events[0].categories).toEqual(["Event,Event", "Security"]);
    expect(events[0].startInstant).toBe("2026-05-15T02:30:00.000Z");
    expect(events[0].endInstant).toBe("2026-05-15T05:00:00.000Z");
  });

  it("keeps date-only events on their source day", () => {
    const model = buildCalendarPageModel([
      {
        uid: "all-day-1",
        summary: "Hackday",
        dateKind: "date",
        sourceDate: "2026-05-14",
        sourceFile: "source.ics",
      },
    ], {
      timeZone: "America/Los_Angeles",
      selectedMonth: "2026-05",
      selectedDate: "2026-05-14",
    });

    expect(model.selectedDate).toBe("2026-05-14");
    expect(model.selectedDayEvents).toHaveLength(1);
    expect(model.selectedDayEvents[0].timeLabel).toBe("All day");
  });

  it("groups timed events by the visible day in the client timezone", () => {
    const model = buildCalendarPageModel([
      {
        uid: "timed-1",
        summary: "Late meetup",
        dateKind: "timed",
        startInstant: "2026-05-15T02:30:00.000Z",
        endInstant: "2026-05-15T05:00:00.000Z",
        sourceTimeZone: "America/Los_Angeles",
        country: "USA",
        hackerspaceName: "Noisebridge",
        sourceFile: "source.ics",
      },
    ], {
      timeZone: "America/Los_Angeles",
      selectedMonth: "2026-05",
      selectedDate: "2026-05-14",
    });

    expect(model.selectedDate).toBe("2026-05-14");
    expect(model.selectedDayEvents).toHaveLength(1);
    expect(model.selectedDayEvents[0].timeLabel).toContain("7:30 PM");
    expect(model.selectedDayEvents[0]).toMatchObject({
      countryName: "USA",
      countryFlag: "🇺🇸",
      hackerspaceName: "Noisebridge",
    });
    expect(model.selectedMonth).toBe("2026-05");
  });

  it("defaults to the current month instead of the earliest month with events", () => {
    const model = buildCalendarPageModel([
      {
        uid: "future-1",
        summary: "Future event",
        dateKind: "timed",
        startInstant: "2026-02-02T19:00:00.000Z",
        endInstant: "2026-02-02T21:00:00.000Z",
        sourceTimeZone: "UTC",
        sourceFile: "source.ics",
      },
    ], {
      timeZone: "UTC",
      now: new Date("2026-05-14T12:00:00.000Z"),
    });

    expect(model.selectedMonth).toBe("2026-05");
    expect(model.selectedDate).toBe("2026-05-14");
    expect(model.selectedDayEvents).toEqual([]);
  });

  it("defaults to the current date even when the current month already has earlier events", () => {
    const model = buildCalendarPageModel([
      {
        uid: "current-month-1",
        summary: "Earlier event",
        dateKind: "timed",
        startInstant: "2026-05-02T19:00:00.000Z",
        endInstant: "2026-05-02T21:00:00.000Z",
        sourceTimeZone: "UTC",
        sourceFile: "source.ics",
      },
    ], {
      timeZone: "UTC",
      now: new Date("2026-05-14T12:00:00.000Z"),
    });

    expect(model.selectedMonth).toBe("2026-05");
    expect(model.selectedDate).toBe("2026-05-14");
    expect(model.selectedDayEvents).toEqual([]);
  });

  it("builds date sections only for eventful dates in the selected month and exposes month navigation", () => {
    const model = buildCalendarPageModel([
      {
        uid: "march-1",
        summary: "March event",
        dateKind: "timed",
        startInstant: "2026-03-04T09:00:00.000Z",
        endInstant: "2026-03-04T10:00:00.000Z",
        sourceTimeZone: "UTC",
        sourceFile: "source.ics",
      },
      {
        uid: "april-1",
        summary: "April event one",
        dateKind: "timed",
        startInstant: "2026-04-10T09:00:00.000Z",
        endInstant: "2026-04-10T10:00:00.000Z",
        sourceTimeZone: "UTC",
        sourceFile: "source.ics",
      },
      {
        uid: "april-2",
        summary: "April event two",
        dateKind: "timed",
        startInstant: "2026-04-10T11:00:00.000Z",
        endInstant: "2026-04-10T12:00:00.000Z",
        sourceTimeZone: "UTC",
        sourceFile: "source.ics",
      },
      {
        uid: "april-3",
        summary: "April next day",
        dateKind: "timed",
        startInstant: "2026-04-12T11:00:00.000Z",
        endInstant: "2026-04-12T12:00:00.000Z",
        sourceTimeZone: "UTC",
        sourceFile: "source.ics",
      },
      {
        uid: "june-1",
        summary: "June event",
        dateKind: "timed",
        startInstant: "2026-06-02T09:00:00.000Z",
        endInstant: "2026-06-02T10:00:00.000Z",
        sourceTimeZone: "UTC",
        sourceFile: "source.ics",
      },
    ], {
      timeZone: "UTC",
      selectedMonth: "2026-04",
      now: new Date("2026-05-14T12:00:00.000Z"),
    });

    expect(model.selectedMonth).toBe("2026-04");
    expect(model.selectedMonthLabel).toBe("April 2026");
    expect(model.previousMonth).toBe("2026-03");
    expect(model.previousMonthLabel).toBe("March 2026");
    expect(model.nextMonth).toBe("2026-06");
    expect(model.nextMonthLabel).toBe("June 2026");
    expect(model.dateSections).toHaveLength(2);
    expect(model.dateSections[0]).toMatchObject({
      date: "2026-04-10",
      dateLabel: "Friday/April 10",
    });
    expect(model.dateSections[0].events.map((event) => event.summary)).toEqual([
      "April event one",
      "April event two",
    ]);
    expect(model.dateSections[1]).toMatchObject({
      date: "2026-04-12",
      dateLabel: "Sunday/April 12",
    });
  });

  it("builds a persisted calendar index from normalized events", () => {
    const index = buildCalendarIndex([
      {
        uid: "march-1",
        summary: "March event",
        dateKind: "timed",
        startInstant: "2026-03-04T09:00:00.000Z",
        endInstant: "2026-03-04T10:00:00.000Z",
        sourceTimeZone: "UTC",
        sourceFile: "source.ics",
      },
      {
        uid: "april-overnight",
        summary: "Reading Group",
        dateKind: "timed",
        startInstant: "2026-04-10T22:00:00.000Z",
        endInstant: "2026-04-11T02:00:00.000Z",
        sourceTimeZone: "UTC",
        sourceFile: "source.ics",
        country: "United Kingdom",
        countryFlag: "🇬🇧",
        hackerspaceName: "Glasgow Hackerspace",
      },
      {
        uid: "april-date",
        summary: "Hackday",
        dateKind: "date",
        sourceDate: "2026-04-12",
        sourceFile: "source.ics",
      },
    ], {
      generatedAt: "2026-03-19T20:00:00.000Z",
      timeZone: "UTC",
    });

    expect(index).toMatchObject({
      generatedAt: "2026-03-19T20:00:00.000Z",
      timeZone: "UTC",
      availableMonthsWithEvents: ["2026-03", "2026-04"],
    });
    expect(Object.keys(index.months)).toEqual(["2026-03", "2026-04"]);
    expect(Object.keys(index.months["2026-04"].dates)).toEqual(["2026-04-10", "2026-04-11", "2026-04-12"]);
    expect(index.months["2026-04"].dates["2026-04-10"].events[0]).toMatchObject({
      uid: "april-overnight",
      summary: "Reading Group",
      timeLabel: "Apr 10 10:00 PM - Apr 11 2:00 AM",
      countryName: "United Kingdom",
      countryFlag: "🇬🇧",
      hackerspaceName: "Glasgow Hackerspace",
    });
    expect(index.months["2026-04"].dates["2026-04-12"].events[0]).toMatchObject({
      uid: "april-date",
      summary: "Hackday",
      timeLabel: "All day",
    });
  });

  it("derives sorted unique country and hackerspace filter options from calendar metadata", () => {
    const model = buildCalendarPageModel([
      {
        uid: "event-1",
        summary: "Open Night",
        dateKind: "timed",
        startInstant: "2026-05-14T19:00:00.000Z",
        endInstant: "2026-05-14T21:00:00.000Z",
        sourceTimeZone: "UTC",
        country: "Germany",
        hackerspaceName: "Alpha Lab",
        sourceFile: "source.ics",
      },
      {
        uid: "event-2",
        summary: "Hackday",
        dateKind: "timed",
        startInstant: "2026-05-15T19:00:00.000Z",
        endInstant: "2026-05-15T21:00:00.000Z",
        sourceTimeZone: "UTC",
        country: "Austria",
        hackerspaceName: "Beta Space",
        sourceFile: "source.ics",
      },
      {
        uid: "event-3",
        summary: "Workshop",
        dateKind: "timed",
        startInstant: "2026-05-16T19:00:00.000Z",
        endInstant: "2026-05-16T21:00:00.000Z",
        sourceTimeZone: "UTC",
        country: "Germany",
        hackerspaceName: "Alpha Lab",
        sourceFile: "source.ics",
      },
    ], {
      timeZone: "UTC",
      selectedMonth: "2026-05",
      now: new Date("2026-05-14T12:00:00.000Z"),
    });

    expect(model.availableCountries).toEqual(["Austria", "Germany"]);
    expect(model.availableHackerspaces).toEqual(["Alpha Lab", "Beta Space"]);
    expect(model.selectedCountry).toBe("all");
    expect(model.selectedHackerspace).toBe("all");
  });

  it("omits previous and next month links when the selected month has no eventful neighbors", () => {
    const model = buildCalendarPageModel([
      {
        uid: "may-1",
        summary: "Only month event",
        dateKind: "timed",
        startInstant: "2026-05-14T09:00:00.000Z",
        endInstant: "2026-05-14T10:00:00.000Z",
        sourceTimeZone: "UTC",
        sourceFile: "source.ics",
      },
    ], {
      timeZone: "UTC",
      selectedMonth: "2026-05",
      now: new Date("2026-05-14T12:00:00.000Z"),
    });

    expect(model.previousMonth).toBeNull();
    expect(model.nextMonth).toBeNull();
    expect(model.dateSections).toHaveLength(1);
  });

  it("returns a stable empty state when the ICS directory does not exist", async () => {
    const events = await readCalendarEvents({ directoryPath: "/tmp/does-not-exist-calendar-dir" });

    expect(events).toEqual([]);
  });

  it("retries transient ICS fetch failures and then parses the source", async () => {
    const fetchImpl = vi.fn();
    fetchImpl
      .mockRejectedValueOnce(Object.assign(new Error("temporary dns failure"), { code: "EAI_AGAIN" }))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: "https://calendar.example/events.ics",
        headers: {
          get(name) {
            return name.toLowerCase() === "content-type" ? "text/calendar; charset=utf-8" : null;
          },
        },
        async text() {
          return `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event-1
SUMMARY:Open Night
DTSTART:20260514T190000Z
DTEND:20260514T210000Z
END:VEVENT
END:VCALENDAR`;
        },
      });

    const logger = vi.fn();
    const result = await refreshCalendarSnapshot({
      sourceItems: [
        {
          url: "https://calendar.example/events.ics",
          country: "Germany",
          hs_name: "Test Space",
        },
      ],
      fetchImpl,
      logger,
      waitImpl: vi.fn().mockResolvedValue(undefined),
      retryDelaysMs: [1],
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.summary).toMatchObject({
      parsedSources: 1,
      failedSources: 0,
      parsedEvents: 1,
    });
    expect(result.events[0]).toMatchObject({
      summary: "Open Night",
      country: "Germany",
      hackerspaceName: "Test Space",
    });
    expect(logger).toHaveBeenCalledWith(
      "[refresh] retrying calendar source fetch: https://calendar.example/events.ics after EAI_AGAIN (attempt 2/2, wait 1ms)",
    );
  });

  it("uses a 5 second timeout on the final calendar fetch attempt by default", async () => {
    const fetchImpl = vi.fn();
    fetchImpl
      .mockRejectedValueOnce(Object.assign(new Error("temporary dns failure"), { code: "EAI_AGAIN" }))
      .mockRejectedValueOnce(Object.assign(new Error("temporary dns failure"), { code: "EAI_AGAIN" }))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: "https://calendar.example/events.ics",
        headers: {
          get(name) {
            return name.toLowerCase() === "content-type" ? "text/calendar; charset=utf-8" : null;
          },
        },
        async text() {
          return `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event-1
SUMMARY:Open Night
DTSTART:20260514T190000Z
DTEND:20260514T210000Z
END:VEVENT
END:VCALENDAR`;
        },
      });

    const timeoutCalls = [];
    const originalSetTimeout = globalThis.setTimeout;
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation((handler, timeout, ...args) => {
      timeoutCalls.push(timeout);
      return originalSetTimeout(handler, timeout, ...args);
    });

    try {
      await refreshCalendarSnapshot({
        sourceItems: [
          {
            url: "https://calendar.example/events.ics",
            country: "Germany",
            hs_name: "Test Space",
          },
        ],
        fetchImpl,
        logger: vi.fn(),
        waitImpl: vi.fn().mockResolvedValue(undefined),
        retryDelaysMs: [1, 1],
      });
    } finally {
      setTimeoutSpy.mockRestore();
    }

    expect(timeoutCalls).toContain(5000);
  });
});
