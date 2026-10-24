import { expect, it } from 'vitest';
import { parseCalendarIcsText } from '../../src/calendar/readCalendarEvents.js';
const parse = body => parseCalendarIcsText(`BEGIN:VCALENDAR\nVERSION:2.0\n${body}\nEND:VCALENDAR`, { sourceFile: 'real-shape.ics', windowYear: 2026 });
const event = body => `BEGIN:VEVENT\nUID:source-series\nSUMMARY:Open night\n${body}\nEND:VEVENT`;
it('expands COUNT and applies RDATE/EXDATE and source-local overrides exactly once', () => {
    const events = parse(event('DTSTART:20260101T190000Z\nDTEND:20260101T210000Z\nRRULE:FREQ=DAILY;COUNT=3\nRDATE:20260105T190000Z\nEXDATE:20260102T190000Z') + '\n' + event('RECURRENCE-ID:20260103T190000Z\nDTSTART:20260103T200000Z\nDTEND:20260103T220000Z'));
    expect(events.map(e => e.startInstant)).toEqual(['2026-01-01T19:00:00.000Z', '2026-01-03T20:00:00.000Z', '2026-01-05T19:00:00.000Z']);
});
it('supports observed ordinal monthly rules and clips before materializing occurrences', () => {
    const events = parse(event('DTSTART;VALUE=DATE:20200101\nRRULE:FREQ=MONTHLY;BYDAY=1WE;UNTIL=20300101'));
    expect(events.length).toBe(36);
    expect(events[0].sourceDate).toBe('2025-01-01');
    expect(events.at(-1).sourceDate).toBe('2027-12-01');
});
it('preserves local wall-clock time across DST and independent same-UID masters', () => {
    const body = event('DTSTART;TZID=Europe/Berlin:20260322T190000\nDTEND;TZID=Europe/Berlin:20260322T210000\nRRULE:FREQ=WEEKLY;COUNT=2');
    expect(parse(body).map(e => e.startInstant)).toEqual(['2026-03-22T18:00:00.000Z', '2026-03-29T17:00:00.000Z']);
    expect(parse(body + '\n' + body)).toHaveLength(4);
});
it('handles audited BYSETPOS, yearly INTERVAL/UNTIL, cancellation and moved overrides', () => {
    expect(parse(event('DTSTART:20260113T190000Z\nRRULE:FREQ=MONTHLY;BYDAY=TU;BYSETPOS=2;COUNT=3')).map(e => e.startInstant)).toEqual(['2026-01-13T19:00:00.000Z', '2026-02-10T19:00:00.000Z', '2026-03-10T19:00:00.000Z']);
    expect(parse(event('DTSTART;VALUE=DATE:20250101\nRRULE:FREQ=YEARLY;INTERVAL=2;UNTIL=20271231')).map(e => e.sourceDate)).toEqual(['2025-01-01', '2027-01-01']);
    const master = event('DTSTART:20260101T190000Z\nRRULE:FREQ=DAILY;COUNT=3');
    const cancelled = event('RECURRENCE-ID:20260102T190000Z\nDTSTART:20260102T190000Z\nSTATUS:CANCELLED');
    const moved = event('RECURRENCE-ID:20260103T190000Z\nDTSTART:20280103T190000Z');
    expect(parse([master, cancelled, moved].join('\n')).map(e => e.startInstant)).toEqual(['2026-01-01T19:00:00.000Z']);
});
it('rejects unobserved subdaily, period and range semantics instead of silently losing occurrences', () => {
    for (const rule of ['DTSTART:20260101T190000Z\nRRULE:FREQ=HOURLY;COUNT=3', 'DTSTART:20260101T190000Z\nRDATE;VALUE=PERIOD:20260102T190000Z/20260102T210000Z'])
        expect(() => parse(event(rule))).toThrow();
});
