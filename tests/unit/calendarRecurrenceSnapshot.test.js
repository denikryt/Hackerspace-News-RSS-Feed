import { expect, it, vi } from 'vitest';
import ICAL from 'ical.js';
import { refreshCalendarSnapshot } from '../../src/calendar/refreshCalendarSnapshot.js';
import { prepareCalendarRecurrences } from '../../src/calendar/prepareCalendarRecurrences.js';
import { normalizeCalendarSnapshot, publicCalendarPayload, calendarYearWindow } from '../../src/calendar/normalizeCalendarSnapshot.js';
const event = body => `BEGIN:VEVENT\nUID:same\nSUMMARY:Same title\n${body}\nEND:VEVENT`;
const calendar = body => `BEGIN:VCALENDAR\nVERSION:2.0\n${body}\nEND:VCALENDAR`;
async function read(body, year = 2026, sources = 1) {
    return JSON.parse(JSON.stringify(await refreshCalendarSnapshot({
        now: Date.parse(`${year}-06-01T12:00:00Z`),
        sourceItems: Array.from({ length: sources }, (_, i) => ({ url: `https://source${i}.test/events.ics`, country: i ? 'France' : 'Germany', hs_name: `Space ${i}` })),
        fetchImpl: async () => new Response(calendar(body), { headers: { 'content-type': 'text/calendar' } }),
    })));
}
const expand = (payload, year) => normalizeCalendarSnapshot(prepareCalendarRecurrences(payload, { windowYear: year }));
it('retains future RDATE/EXDATE and moved/cancelled exceptions, while COUNT/UNTIL remain finite', async () => {
    const data = await read([
        event('DTSTART;VALUE=DATE:20250101\nRRULE:FREQ=YEARLY\nRDATE;VALUE=DATE:20280701\nEXDATE;VALUE=DATE:20270101'),
        event('RECURRENCE-ID;VALUE=DATE:20280101\nDTSTART;VALUE=DATE:20280102\nDESCRIPTION:Moved'),
        event('RECURRENCE-ID;VALUE=DATE:20290101\nDTSTART;VALUE=DATE:20290101\nSTATUS:CANCELLED'),
        event('DTSTART;VALUE=DATE:20250201\nRRULE:FREQ=YEARLY;COUNT=3'),
        event('DTSTART;VALUE=DATE:20250301\nRRULE:FREQ=YEARLY;UNTIL=20270301'),
    ].join('\n'));
    const rendered = expand(data, 2028);
    const dates = rendered.events.map(e => e.sourceDate);
    expect(dates).toContain('2028-01-02');
    expect(dates).toContain('2028-07-01');
    expect(dates).not.toContain('2028-01-01');
    expect(dates).not.toContain('2029-01-01');
    expect(dates).not.toContain('2027-01-01');
    expect(dates).not.toContain('2028-02-01');
    expect(dates).not.toContain('2028-03-01');
    expect(dates.every(date => date >= '2027-01-01' && date < '2030-01-01')).toBe(true);
});
it('produces the same canonical order as a fresh refresh, preserving independent same-UID source records', async () => {
    const body = [event('DTSTART;VALUE=DATE:20250101\nRRULE:FREQ=YEARLY\nDESCRIPTION:First series'), event('DTSTART;VALUE=DATE:20280101\nDESCRIPTION:Independent record'), event('DTSTART;VALUE=DATE:20250101\nRRULE:FREQ=YEARLY\nDESCRIPTION:Second series')].join('\n');
    const old = await read(body, 2026, 2);
    const fresh = await read(body, 2027, 2);
    const rendered = expand(old, 2027);
    expect(rendered.events).toEqual(fresh.events);
    expect(rendered.events.filter(e => e.sourceDate === '2028-01-01')).toHaveLength(6);
    expect(rendered.events.filter(e => e.description === 'Independent record')).toHaveLength(2);
    expect(new Set(rendered.events.map(e => e.sourceFile)).size).toBe(2);
});
it('keeps timezone/DST metadata and bounded descriptions in serialized recurrence definitions', async () => {
    const data = await read(event(`DTSTART;TZID=Europe/Berlin:20250330T193000\nDTEND;TZID=Europe/Berlin:20250330T210000\nRRULE:FREQ=YEARLY\nDESCRIPTION:${'😀'.repeat(1096)}`));
    const source = data.recurrence.sources[0];
    const description = source.calendar[2].find(c => c[0] === 'vevent')[1].find(p => p[0] === 'description')[3];
    expect(Array.from(description)).toHaveLength(1095);
    const rendered = expand(data, 2027);
    expect(rendered.events.every(e => e.sourceTimeZone === 'Europe/Berlin' && e.startInstant.endsWith('17:30:00.000Z'))).toBe(true);
    expect(rendered.events.every(e => Array.from(e.description).length === 1095)).toBe(true);
    const published = publicCalendarPayload(rendered, calendarYearWindow(2027));
    expect(published).not.toHaveProperty('recurrence');
    expect(published.events.every(event => !('sourceComponentIndex' in event))).toBe(true);
    expect(published.items.every(item => !('events' in item) && !('recurrence' in item))).toBe(true);
});
it('rejects malformed or unsupported stored definitions even in the cached year', async () => {
    const data = await read(event('DTSTART;VALUE=DATE:20250101\nRRULE:FREQ=YEARLY'));
    const corruptions = [
        x => { x.recurrence.schemaVersion = 2; },
        x => { x.recurrence.sources[0].country = {invalid: 'metadata'}; },
        x => { x.recurrence.sources.push(x.recurrence.sources[0]); },
        x => { x.recurrence.sources[0].componentIndexes = [-1]; },
        x => { x.recurrence.sources[0].calendar[2].find(c => c[0] === 'vevent')[1] = [['uid', {}, 'text', 'same'], ['dtstart', {}, 'date', '2025-01-01']]; },
    ];
    for (const corrupt of corruptions) {
        const copy = structuredClone(data);
        corrupt(copy);
        expect(() => expand(copy, 2026)).toThrow('invalid_calendar_recurrence_snapshot');
    }
});
it('restores a series that has no occurrences in the original saved window', async () => {
    const data = await read(event('DTSTART;VALUE=DATE:20300101\nRRULE:FREQ=YEARLY'));
    expect(data.events).toHaveLength(0);
    expect(expand(data, 2029).events.map(e => e.sourceDate)).toEqual(['2030-01-01']);
    expect(expand(data, 2029).summary.parsedEvents).toBe(1);
});
it('retains timed timezone edge candidates while visible day indices stay inside the new window', async () => {
    const data = await read(event('DTSTART;TZID=Pacific/Kiritimati:20250101T003000\nDTEND;TZID=Pacific/Kiritimati:20250101T010000\nRRULE:FREQ=YEARLY'));
    const rendered = expand(data, 2027);
    expect(rendered.events.map(e => e.startInstant)).toContain('2025-12-31T10:30:00.000Z');
    expect(rendered.events.map(e => e.startInstant)).toContain('2028-12-31T10:30:00.000Z');
    expect(rendered.events.every(e => e.startInstant >= '2025-12-31' && e.startInstant < '2029-01-02')).toBe(true);
});
it('does not trust a rebuilt derived index as proof that legacy occurrences cover the new year', async () => {
    const old = await read(event('DTSTART;VALUE=DATE:20250101\nRRULE:FREQ=YEARLY'));
    delete old.recurrence;
    expect(() => prepareCalendarRecurrences(old, { windowYear: 2027, previousWindowYear: 2027 })).toThrow('calendar_recurrence_refresh_required');
    expect(prepareCalendarRecurrences(old, { windowYear: 2026, previousWindowYear: 2026 })).toBe(old);
});
it('reuses the saved materialization without recurrence iteration in the same year', async () => {
    const data = await read(event('DTSTART;VALUE=DATE:20250101\nRRULE:FREQ=YEARLY'));
    const iteration = vi.spyOn(ICAL.RecurExpansion.prototype, 'next');
    try {
        expect(prepareCalendarRecurrences(data, { windowYear: 2026 })).toBe(data);
        expect(iteration).not.toHaveBeenCalled();
        expand(data, 2027);
        expect(iteration).toHaveBeenCalled();
    }
    finally {
        iteration.mockRestore();
    }
});
it('rejects unsupported orphan override semantics during refresh rather than persist invalid future rules',async()=>{
 const payload=await read(event('RECURRENCE-ID;VALUE=DATE;RANGE=THISANDFUTURE:20280101\nDTSTART;VALUE=DATE:20280102'));
 expect(payload.items[0]).toMatchObject({status:'fetch_failed',errorCode:'unsupported_calendar_recurrence'});
 expect(payload).not.toHaveProperty('recurrence');
});
