import { afterEach, describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDir } from "../_shared/tempDirs.js";
import { formatDateKeyInTimeZone, shiftMonthKey } from "../../src/calendar/dateFormatting.js";
import { buildCalendarPageModel, readCalendarEvents } from "../../src/calendar/index.js";

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
});
