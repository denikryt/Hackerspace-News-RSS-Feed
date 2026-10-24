import { expect, it } from 'vitest';
import { buildCalendarIndex, sourceEventsDigest } from '../../src/calendar/buildCalendarIndex.js';

// Key insertion order and stable tie ordering are part of the persisted JSON
// contract, independently of which collection the builder uses internally.
it('sorts months, dates and references while preserving equal independent entries and canonical order', () => {
    const early = {uid:'same',summary:'Beta',dateKind:'timed',startInstant:'2026-05-17T09:00:00Z'};
    const events = [
        {uid:'late',summary:'Zulu',dateKind:'timed',startInstant:'2026-05-17T18:00:00Z'},
        {uid:'april',summary:'April',dateKind:'date',sourceDate:'2026-04-30'},
        early,
        {...early,country:'Germany'},
        {...early,summary:'Alpha'},
        {uid:'previous',summary:'Previous',dateKind:'date',sourceDate:'2026-05-16'},
        {uid:'june',summary:'June',dateKind:'date',sourceDate:'2026-06-01'},
    ];
    const before = JSON.stringify(events);
    const result = buildCalendarIndex(events,{windowYear:2026,timeZone:'UTC',generatedAt:'2026-10-24T12:00:00Z'});
    expect(Object.keys(result.months)).toEqual(['2026-04','2026-05','2026-06']);
    expect(Object.keys(result.months['2026-05'].dates)).toEqual(['2026-05-16','2026-05-17']);
    const day = result.months['2026-05'].dates['2026-05-17'];
    expect(Object.keys(day)).toEqual(['dateKey','dateLabel','eventIndexes']);
    expect(day.eventIndexes).toEqual([4,2,3,0]);
    expect(result.availableMonthsWithEvents).toEqual(Object.keys(result.months));
    expect(result.sourceEventsSha256).toBe(sourceEventsDigest(events));
    expect(JSON.stringify(events)).toBe(before);
});
