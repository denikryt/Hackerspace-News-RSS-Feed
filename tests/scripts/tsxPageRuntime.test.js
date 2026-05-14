import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

describe("tsx-backed page runtime", () => {
  it("keeps the centralized page bridge importable from plain node js entry points", () => {
    const stdout = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
          import {
            renderAboutPageTsx,
            renderCalendarPageTsx,
            renderGlobalFeedPageTsx,
          } from "./src/renderers/tsxPageRuntime.js";

          console.log(JSON.stringify({
            about: renderAboutPageTsx(),
            calendar: renderCalendarPageTsx({
              pageTitle: "Calendar",
              pageIntro: "Upcoming events from ICS feeds.",
              navItems: [{ href: "/calendar/", label: "Calendar", isCurrent: true }],
              selectedDate: "2026-05-14",
              selectedDateLabel: "Thursday, May 14, 2026",
              selectedMonthLabel: "May 2026",
              weekDayLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
              weeks: [],
              selectedDayEvents: [],
              serializedEventsJson: "[]",
              serializedInitialStateJson: "{\\\"selectedDate\\\":\\\"2026-05-14\\\",\\\"selectedMonth\\\":\\\"2026-05\\\"}",
            }),
            feed: renderGlobalFeedPageTsx({
              items: [],
              homeHref: "/",
              currentPageLabel: "Page 1 of 1",
              streamNavItems: [{ href: "/news/", label: "News", isCurrent: true }],
            }),
          }));
        `,
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: "pipe",
      },
    );

    const payload = JSON.parse(stdout.trim());

    expect(payload.about).toContain("<title>About</title>");
    expect(payload.calendar).toContain("<title>Calendar</title>");
    expect(payload.calendar).toContain('src="/calendar-page.js"');
    expect(payload.about).toContain("<strong>Data Sources:</strong>");
    expect(payload.feed).toContain("<title>Feed</title>");
    expect(payload.feed).toContain('href="/news/"');
    expect(payload.feed).toContain("No feed items available.");
  });
});
