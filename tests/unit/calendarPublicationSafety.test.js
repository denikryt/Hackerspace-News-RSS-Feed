import { expect, it, vi } from "vitest";
import { calendarYearWindow, publicCalendarPayload } from "../../src/calendar/normalizeCalendarSnapshot.js";
import { refreshCalendarSnapshot } from "../../src/calendar/refreshCalendarSnapshot.js";
it("keeps timed edge candidates for browser timezones while excluding distant events", () => {
    const events = ["2024-12-31T18:00:00Z", "2028-01-01T02:00:00Z", "2024-12-29T18:00:00Z", "2028-01-03T00:00:00Z"].map(startInstant => ({ dateKind: "timed", startInstant }));
    const dates = [{ dateKind: "date", sourceDate: "2024-12-31", endSourceDateExclusive: "2025-01-01" }];
    expect(publicCalendarPayload({ events: [...events, ...dates] }, calendarYearWindow(2026)).events).toEqual(events.slice(0, 2));
});
it("never logs or stores malformed ICS input in diagnostics", async () => {
    const secret = "PRIVATE_ICS_TEXT_MUST_NOT_BE_LOGGED";
    const body = `BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20260101\nRRULE:FREQ=${secret}\nEND:VEVENT\nEND:VCALENDAR`;
    const logger = vi.fn();
    const result = await refreshCalendarSnapshot({ sourceItems: [{ url: "https://example.test/a.ics" }], fetchImpl: async () => new Response(body, { headers: { "Content-Type": "text/calendar" } }), logger });
    expect(result.items[0].status).toBe("fetch_failed");
    expect(JSON.stringify([result, logger.mock.calls])).not.toContain(secret);
});
