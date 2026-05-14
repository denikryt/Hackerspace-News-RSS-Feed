import { afterEach, describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDir } from "../_shared/tempDirs.js";
import { buildCalendarPageModel, readCalendarEvents } from "../../src/calendar/index.js";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
});

describe("calendar module", () => {
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
  });

  it("returns a stable empty state when the ICS directory does not exist", async () => {
    const events = await readCalendarEvents({ directoryPath: "/tmp/does-not-exist-calendar-dir" });

    expect(events).toEqual([]);
  });
});
