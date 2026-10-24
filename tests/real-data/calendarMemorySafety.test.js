import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { parseCalendarIcsText } from "../../src/calendar/readCalendarEvents.js";
import { normalizeCalendarSnapshot } from "../../src/calendar/normalizeCalendarSnapshot.js";
import { buildCalendarIndex, isCalendarIndexValid } from "../../src/calendar/buildCalendarIndex.js";
const raw = resolve("data/calendar/raw");
// Saved responses are optional developer data; CI never fetches live calendars.
it.skipIf(!existsSync(raw))("parses saved production ICS into bounded canonical events and numeric reference indices", () => {
    let files = 0;
    let records = 0;
    for (const file of readdirSync(raw).filter(file => file.endsWith(".ics"))) {
        const events = parseCalendarIcsText(readFileSync(resolve(raw, file), "utf8"), { sourceFile: file, windowYear: 2026 });
        const payload = normalizeCalendarSnapshot({ events });
        expect(payload.events).toHaveLength(events.length);
        expect(payload.events.every(event => Array.from(event.description || "").length <= 1095)).toBe(true);
        const index = buildCalendarIndex(payload.events, { windowYear: 2026 });
        expect(isCalendarIndexValid(index, payload.events, { windowYear: 2026 })).toBe(true);
        expect(JSON.stringify(index)).not.toContain('"description"');
        files++;
        records += events.length;
    }
    expect(files).toBeGreaterThan(0);
    expect(records).toBeGreaterThan(0);
    console.log(JSON.stringify({ savedIcsFiles: files, parsedRecords: records }));
}, 60000);
