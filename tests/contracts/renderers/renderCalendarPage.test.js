import { describe, expect, it } from "vitest";

import { renderCalendarPage } from "../../../src/renderers/renderCalendarPage.js";

const MODEL = {
  pageTitle: "Calendar",
  pageIntro: "Upcoming events from ICS feeds.",
  selectedMonth: "2026-05",
  selectedMonthLabel: "May 2026",
  previousMonth: "2026-03",
  previousMonthLabel: "March 2026",
  previousMonthHref: "/calendar/2026-03/",
  nextMonth: "2026-06",
  nextMonthLabel: "June 2026",
  nextMonthHref: "/calendar/2026-06/",
  dateSections: [
    {
      date: "2026-05-14",
      dateLabel: "Thursday/May 14",
      events: [
        {
          summary: "DC415",
          dateLabel: "Thursday, May 14, 2026",
          timeLabel: "7:30 PM - 10:00 PM",
          location: "Noisebridge",
          url: "https://example.com/dc415",
          organizer: "Noisebridge",
        },
      ],
    },
  ],
};

describe("renderCalendarPage", () => {
  it("renders the calendar page shell and nav", () => {
    const html = renderCalendarPage(MODEL);

    expect(html).toContain("<title>Calendar</title>");
    expect(html).toContain('<h1 class="home-hero-title">Calendar</h1>');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/news/"');
    expect(html).toContain('href="/calendar/"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/authors/"');
    expect(html).toContain('<script src="/calendar-time.js"></script>');
    expect(html).toContain('data-calendar-events-path="/calendar/events.json"');
    expect(html).toContain('data-calendar-fallback-month="2026-05"');
  });

  it("renders the month switcher and date columns", () => {
    const html = renderCalendarPage(MODEL);

    expect(html).toContain('class="calendar-shell');
    expect(html).toContain("May 2026");
    expect(html).toContain("March 2026");
    expect(html).toContain("June 2026");
    expect(html).toContain('<span class="calendar-date-band-weekday">Thursday/</span><span class="calendar-date-band-date">May 14</span>');
    expect(html).toContain("DC415");
    expect(html).toContain("7:30 PM - 10:00 PM");
    expect(html).toContain("Noisebridge");
    expect(html).not.toContain("calendar-tag");
    expect(html).toContain('class="calendar-month-switcher"');
    expect(html).toContain('class="calendar-columns"');
  });

  it("renders without the old interactive calendar runtime", () => {
    const html = renderCalendarPage(MODEL);

    expect(html).not.toContain('src="/calendar-page.js"');
    expect(html).not.toContain('id="calendar-initial-state"');
    expect(html).not.toContain('data-events-path=');
    expect(html).not.toContain("calendar-grid");
  });

  it("omits missing optional event fields cleanly", () => {
    const html = renderCalendarPage({
      ...MODEL,
      previousMonth: null,
      previousMonthLabel: null,
      previousMonthHref: null,
      nextMonth: null,
      nextMonthLabel: null,
      nextMonthHref: null,
      dateSections: [{ date: "2026-05-14", dateLabel: "Thursday/May 14", events: [{ summary: "Open Night", dateLabel: "Thursday, May 14", timeLabel: null, location: null, url: null, organizer: null }] }],
    });

    expect(html).toContain("Open Night");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null");
    expect(html).not.toContain("March 2026");
    expect(html).not.toContain("June 2026");
  });
});
