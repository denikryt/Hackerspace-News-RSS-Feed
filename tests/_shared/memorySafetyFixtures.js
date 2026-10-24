import { RESOURCE_LIMITS } from '../../src/resourceLimits.js';
export function legacyInputs() {
    const event = { uid: 'keep', summary: 'Boundary event', dateKind: 'date', start: '20271231', end: '20280102', sourceDate: '2028-01-02', description: 'x'.repeat(RESOURCE_LIMITS.textMaxCodePoints + 1) };
    return { now: Date.parse('2026-05-17T12:00:00Z'), sourceRowsPayload: { urls: [] }, validationsPayload: [], normalizedPayload: { summary: { sourceRows: 1, validFeeds: 1, parsedFeeds: 1, emptyFeeds: 0, failedFeeds: 0 }, feeds: [{ id: 'space', spaceName: 'Real Shape', country: 'Germany', items: [{ id: 'keep', title: 'Post', link: 'https://example.test/post', displayDate: '2026-05-16T10:00:00.000Z', summaryText: 'x'.repeat(RESOURCE_LIMITS.textMaxCodePoints + 1) }] }], failures: [] }, calendarPayload: { events: [event], items: [{ url: 'https://example.test/calendar', eventCount: 8, events: [event] }] }, calendarIndexPayload: { months: {}, availableMonthsWithEvents: [] } };
}
