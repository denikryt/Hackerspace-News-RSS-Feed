import { describe, expect, it } from "vitest";

import { analyzeCalendarIcsText } from "../../src/calendarSourceAnalysis.js";

describe("calendarSourceAnalysis", () => {
  it("counts observed VEVENT properties and date encodings from ICS text", () => {
    const report = analyzeCalendarIcsText(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event-1
SUMMARY:Open Night
DTSTART:20260523T070000Z
DTEND:20260523T090000Z
URL:https://example.com/open-night
LOCATION:Somewhere
END:VEVENT
BEGIN:VEVENT
UID:event-2
SUMMARY:Hackday
DTSTART;TZID=America/Los_Angeles:20260524T193000
DESCRIPTION:Bring a laptop
END:VEVENT
BEGIN:VEVENT
UID:event-3
SUMMARY:All day
DTSTART;VALUE=DATE:20260525
END:VEVENT
END:VCALENDAR`);

    expect(report.totalEvents).toBe(3);
    expect(report.propertyCounts).toMatchObject({
      UID: 3,
      SUMMARY: 3,
      DTSTART: 3,
      DTEND: 1,
      URL: 1,
      LOCATION: 1,
      DESCRIPTION: 1,
    });
    expect(report.dtstartEncodings).toEqual({
      utc: 1,
      zoned: 1,
      date: 1,
      floating: 0,
    });
    expect(report.timeZones).toEqual({
      "America/Los_Angeles": 1,
    });
  });
});
