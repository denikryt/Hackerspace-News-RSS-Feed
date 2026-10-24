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

it.skipIf(!existsSync(raw))('re-expands saved production recurrence definitions to the next year exactly like fresh parsing', async () => {
    const { parseCalendarIcsSnapshot, sortCalendarEvents } = await import('../../src/calendar/readCalendarEvents.js');
    const { prepareCalendarRecurrences } = await import('../../src/calendar/prepareCalendarRecurrences.js');
    let sources = 0;
    let events = 0;
    let definitionsBytes = 0;
    for (const file of readdirSync(raw).filter(file => file.endsWith('.ics'))) {
        const text = readFileSync(resolve(raw, file), 'utf8');
        const old = parseCalendarIcsSnapshot(text, { sourceFile:file, windowYear:2026 });
        const fresh = parseCalendarIcsSnapshot(text, { sourceFile:file, windowYear:2027 });
        const metadata = {country:null,countryFlag:null,hackerspaceName:null};
        const payload = {generatedAt:'2026-06-01T12:00:00Z',items:[],events:sortCalendarEvents(old.events.map(event=>({...event,...metadata})))};
        if (old.recurrence) {
            payload.recurrence={schemaVersion:1,windowYear:2026,sources:[{sourceFile:file,...metadata,...old.recurrence}]};
            definitionsBytes += Buffer.byteLength(JSON.stringify(payload.recurrence));
        }
        const persisted=JSON.parse(JSON.stringify(payload));
        const rendered=normalizeCalendarSnapshot(prepareCalendarRecurrences(persisted,{windowYear:2027,previousWindowYear:2026}));
        expect(rendered.events, file).toEqual(normalizeCalendarSnapshot({events:sortCalendarEvents(fresh.events.map(event=>({...event,...metadata})))}).events);
        sources++;events+=rendered.events.length;
    }
    expect(sources).toBeGreaterThan(0);
    console.log(JSON.stringify({savedSources:sources,nextYearRecords:events,privateDefinitionsBytes:definitionsBytes}));
},60000);
