import { readFileSync } from "node:fs";
import vm from "node:vm";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const CALENDAR_TIME_SOURCE = readFileSync(resolve(process.cwd(), "static/calendar-time.js"), "utf8");

describe("calendar-time runtime", () => {
  it("applies country and hackerspace filters together and omits empty date columns", () => {
    const hooks = loadCalendarTimeHooks();
    const model = hooks.buildClientCalendarModel({
      events: [
        {
          summary: "Alpha Germany",
          dateKind: "timed",
          startInstant: "2026-05-14T19:00:00.000Z",
          endInstant: "2026-05-14T20:00:00.000Z",
          country: "Germany",
          countryFlag: "🇩🇪",
          hackerspaceName: "Alpha Lab",
        },
        {
          summary: "Beta Germany",
          dateKind: "timed",
          startInstant: "2026-05-15T19:00:00.000Z",
          endInstant: "2026-05-15T20:00:00.000Z",
          country: "Germany",
          countryFlag: "🇩🇪",
          hackerspaceName: "Beta Space",
        },
        {
          summary: "Alpha Austria",
          dateKind: "timed",
          startInstant: "2026-05-16T19:00:00.000Z",
          endInstant: "2026-05-16T20:00:00.000Z",
          country: "Austria",
          countryFlag: "🇦🇹",
          hackerspaceName: "Alpha Lab",
        },
      ],
      selectedMonth: "2026-05",
      timeZone: "UTC",
      now: new Date("2026-05-14T12:00:00.000Z"),
      selectedCountry: "Germany",
      selectedHackerspace: "Alpha Lab",
    });

    expect(model.availableCountries).toEqual(["Austria", "Germany"]);
    expect(model.availableHackerspaces).toEqual(["Alpha Lab", "Beta Space"]);
    expect(model.selectedCountry).toBe("Germany");
    expect(model.selectedHackerspace).toBe("Alpha Lab");
    expect(model.dateSections).toHaveLength(1);
    expect(model.dateSections[0].date).toBe("2026-05-14");
    expect(model.dateSections[0].events.map((event) => event.summary)).toEqual(["Alpha Germany"]);
  });

  it("restores only valid stored filter values and persists current selection", () => {
    const hooks = loadCalendarTimeHooks();
    const storage = createMemoryStorage({
      "hackerspace-news-feed.calendar.country": "Germany",
      "hackerspace-news-feed.calendar.hackerspace": "Unknown Space",
    });

    const restored = hooks.loadStoredFilterSelection({
      storage,
      filterOptions: {
        availableCountries: ["Austria", "Germany"],
        availableHackerspaces: ["Alpha Lab", "Beta Space"],
      },
    });

    expect(restored).toEqual({
      selectedCountry: "Germany",
      selectedHackerspace: "all",
    });

    hooks.persistFilterSelection({
      storage,
      filterSelection: {
        selectedCountry: "Austria",
        selectedHackerspace: "Beta Space",
      },
    });

    expect(storage.getItem("hackerspace-news-feed.calendar.country")).toBe("Austria");
    expect(storage.getItem("hackerspace-news-feed.calendar.hackerspace")).toBe("Beta Space");
  });
});

function loadCalendarTimeHooks() {
  const context = {
    Intl,
    Date,
    console,
    setTimeout,
    clearTimeout,
  };
  context.globalThis = context;

  vm.runInNewContext(
    `${CALENDAR_TIME_SOURCE}
globalThis.__calendarTimeHooks = {
  buildClientCalendarModel,
  listVisibleDatesForEvent,
  loadStoredFilterSelection,
  persistFilterSelection
};`,
    context,
    { filename: "calendar-time.js" },
  );

  return context.__calendarTimeHooks;
}

function createMemoryStorage(initialValues = {}) {
  const store = new Map(Object.entries(initialValues));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}


itWindowParity();
function itWindowParity() {
  it("clips centuries before expanding days, shares year rollover, and preserves timezone edge candidates", () => {
    const hooks = loadCalendarTimeHooks();
    const window = {windowStart:'2025-01-01', windowEndExclusive:'2028-01-01'};
    const days = hooks.listVisibleDatesForEvent({dateKind:'date',sourceDate:'1900-01-01',endSourceDateExclusive:'2100-01-01'}, 'UTC', window);
    expect(days).toHaveLength(1095); expect(days[0]).toBe('2025-01-01'); expect(days.at(-1)).toBe('2027-12-31');
    expect(hooks.listVisibleDatesForEvent({dateKind:'date',sourceDate:'2027-12-31',endSourceDateExclusive:'2028-01-02'},'UTC',window)).toEqual(['2027-12-31']);
    expect(hooks.listVisibleDatesForEvent({dateKind:'date',sourceDate:'2028-01-01',endSourceDateExclusive:'2028-01-02'},'UTC',window)).toEqual([]);
    const timed={dateKind:'timed',startInstant:'2024-12-31T18:00:00Z'};
    expect(hooks.listVisibleDatesForEvent(timed,'UTC',window)).toEqual([]);
    expect(hooks.listVisibleDatesForEvent(timed,'Pacific/Kiritimati',window)).toEqual(['2025-01-01']);
    const rolled = hooks.buildClientCalendarModel({events:[{dateKind:'date',sourceDate:'2028-01-01',endSourceDateExclusive:'2028-01-02'}],selectedMonth:'2028-01',timeZone:'UTC',now:new Date('2027-01-01')});
    expect(rolled.dateSections).toHaveLength(1);
  });
}
