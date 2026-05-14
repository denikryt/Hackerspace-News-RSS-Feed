import { describe, expect, it } from "vitest";

import { renderCalendarPage } from "../../../src/renderers/renderCalendarPage.js";

const MODEL = {
  pageTitle: "Calendar",
  pageIntro: "Upcoming events from ICS feeds.",
  selectedDate: "2026-05-14",
  selectedDateLabel: "Thursday, May 14, 2026",
  selectedMonth: "2026-05",
  selectedMonthLabel: "May 2026",
  weekDayLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  weeks: [
    [
      { date: "2026-05-11", dayNumber: 11, isCurrentMonth: true, isSelected: false, hasEvents: false },
      { date: "2026-05-12", dayNumber: 12, isCurrentMonth: true, isSelected: false, hasEvents: false },
      { date: "2026-05-13", dayNumber: 13, isCurrentMonth: true, isSelected: false, hasEvents: false },
      { date: "2026-05-14", dayNumber: 14, isCurrentMonth: true, isSelected: true, hasEvents: true },
      { date: "2026-05-15", dayNumber: 15, isCurrentMonth: true, isSelected: false, hasEvents: false },
      { date: "2026-05-16", dayNumber: 16, isCurrentMonth: true, isSelected: false, hasEvents: false },
      { date: "2026-05-17", dayNumber: 17, isCurrentMonth: true, isSelected: false, hasEvents: false },
    ],
  ],
  selectedDayEvents: [
    {
      summary: "DC415",
      dateLabel: "Thu, May 14, 2026",
      timeLabel: "7:30 PM - 10:00 PM",
      location: "Noisebridge",
      url: "https://example.com/dc415",
      categories: ["security"],
      organizer: "Noisebridge",
    },
  ],
  serializedEventsJson: "[]",
  serializedInitialStateJson: "{\"selectedDate\":\"2026-05-14\",\"selectedMonth\":\"2026-05\"}",
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
  });

  it("renders the month grid and selected-day events", () => {
    const html = renderCalendarPage(MODEL);

    expect(html).toContain('class="calendar-shell');
    expect(html).toContain("May 2026");
    expect(html).toContain('data-date="2026-05-14"');
    expect(html).toContain("DC415");
    expect(html).toContain("7:30 PM - 10:00 PM");
    expect(html).toContain("Noisebridge");
    expect(html).toContain("security");
  });

  it("includes the calendar client asset and serialized page data", () => {
    const html = renderCalendarPage(MODEL);

    expect(html).toContain('src="/calendar-page.js"');
    expect(html).toContain('id="calendar-events-data"');
    expect(html).toContain('id="calendar-initial-state"');
  });

  it("omits missing optional event fields cleanly", () => {
    const html = renderCalendarPage({
      ...MODEL,
      selectedDayEvents: [{ summary: "Open Night", dateLabel: "Thu, May 14, 2026", timeLabel: null, location: null, url: null, categories: [], organizer: null }],
    });

    expect(html).toContain("Open Night");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null");
  });
});
