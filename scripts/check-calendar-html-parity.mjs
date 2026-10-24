import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { buildCalendarIndex } from "../src/calendar/buildCalendarIndex.js";
import { buildCalendarPageModelFromIndex } from "../src/calendar/buildCalendarPageModel.js";
import { renderCalendarPage } from "../src/renderers/renderCalendarPage.js";

// Compare against immutable project baseline, not a duplicated new algorithm.
// The date-only multi-day bug fix is deliberately outside this parity fixture.
const directory = await mkdtemp(join(process.cwd(), "tmp-calendar-parity-"));
try {
  await mkdir(join(directory, "calendar"));
  for (const file of ["calendar/buildCalendarIndex.js", "calendar/buildCalendarPageModel.js", "calendar/dateFormatting.js", "countryFlags.js"]) {
    await writeFile(join(directory, file), execFileSync("git", ["show", `1338ec92c513cd017706212ecf3a00d1aebcd0c8:src/${file}`]));
  }
  const originalIndex = await import(pathToFileURL(join(directory, "calendar/buildCalendarIndex.js")));
  const originalModel = await import(pathToFileURL(join(directory, "calendar/buildCalendarPageModel.js")));
  const events = [
    { uid: "same", summary: "Independent same UID", dateKind: "timed", startInstant: "2026-05-31T22:00:00Z", endInstant: "2026-06-02T02:00:00Z", description: "Shared description", country: "Germany", hackerspaceName: "Alpha" },
    { uid: "same", summary: "Independent same UID", dateKind: "timed", startInstant: "2026-05-31T22:00:00Z", endInstant: "2026-06-02T02:00:00Z", description: "Shared description", country: "Germany", hackerspaceName: "Beta" },
    { uid: "all-day", summary: "All day", dateKind: "date", sourceDate: "2026-05-31", country: "Austria", hackerspaceName: "Elsewhere" },
    { uid: "next", summary: "Later", dateKind: "timed", startInstant: "2026-07-02T10:00:00Z", country: "France" },
  ];
  for (const timeZone of ["UTC", "Europe/Berlin", "Asia/Tokyo"]) {
    const before = originalIndex.buildCalendarIndex(events, { timeZone });
    const after = buildCalendarIndex(events, { timeZone, windowYear: 2026 });
    for (const selectedMonth of ["2026-05", "2026-06", "2026-07"]) {
      const options = { selectedMonth, timeZone, now: new Date("2026-05-31T12:00:00Z") };
      const oldModel = originalModel.buildCalendarPageModelFromIndex(before, options);
      const newModel = buildCalendarPageModelFromIndex(after, { ...options, events });
      assert.deepEqual(newModel, oldModel);
      assert.equal(renderCalendarPage(newModel), renderCalendarPage(oldModel));
    }
  }
  console.log("Calendar model and HTML parity: 9 timezone/month fixtures, duplicate UID entries, sort, time labels, global filters and navigation match baseline.");
} finally {
  await rm(directory, { recursive: true, force: true });
}
