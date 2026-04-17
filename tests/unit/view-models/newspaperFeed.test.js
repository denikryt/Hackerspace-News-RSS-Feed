import { describe, expect, it } from "vitest";

import {
  COUNTRY_FLAGS,
  buildAvailableDatesByCountry,
  buildAvailableDatesFromPayload,
  buildNewspaperDayModel,
  encodeCountryForPath,
} from "../../../src/viewModels/newspaperFeed.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TODAY = "2026-04-17";
const NOW = new Date("2026-04-17T12:00:00.000Z");

function makePayload(feeds) {
  return { feeds };
}

function makeFeed(country, items) {
  return { country, items };
}

function makeItem(displayDate, extra = {}) {
  return { displayDate, ...extra };
}

// ---------------------------------------------------------------------------
// encodeCountryForPath
// ---------------------------------------------------------------------------

describe("encodeCountryForPath", () => {
  it("replaces spaces with underscores", () => {
    expect(encodeCountryForPath("United Kingdom")).toBe("United_Kingdom");
  });

  it("strips non-alphanumeric non-underscore-dash chars", () => {
    expect(encodeCountryForPath("Türkiye")).toBe("Trkiye");
  });

  it("leaves plain ASCII unchanged", () => {
    expect(encodeCountryForPath("Germany")).toBe("Germany");
  });

  it("handles multiple spaces", () => {
    expect(encodeCountryForPath("United States of America")).toBe("United_States_of_America");
  });

  it("preserves dashes", () => {
    expect(encodeCountryForPath("Ivory-Coast")).toBe("Ivory-Coast");
  });
});

// ---------------------------------------------------------------------------
// COUNTRY_FLAGS
// ---------------------------------------------------------------------------

describe("COUNTRY_FLAGS", () => {
  it("has Germany flag", () => {
    expect(COUNTRY_FLAGS["Germany"]).toBe("🇩🇪");
  });

  it("has United Kingdom flag", () => {
    expect(COUNTRY_FLAGS["United Kingdom"]).toBe("🇬🇧");
  });

  it("has Ukraine flag", () => {
    expect(COUNTRY_FLAGS["Ukraine"]).toBe("🇺🇦");
  });
});

// ---------------------------------------------------------------------------
// buildAvailableDatesFromPayload
// ---------------------------------------------------------------------------

describe("buildAvailableDatesFromPayload", () => {
  it("returns unique dates sorted newest-first", () => {
    const payload = makePayload([
      makeFeed("Germany", [
        makeItem("2026-04-15T10:00:00.000Z"),
        makeItem("2026-04-13T10:00:00.000Z"),
        makeItem("2026-04-15T15:00:00.000Z"),
      ]),
    ]);
    expect(buildAvailableDatesFromPayload(payload, TODAY)).toEqual(["2026-04-15", "2026-04-13"]);
  });

  it("excludes future dates beyond today", () => {
    const payload = makePayload([
      makeFeed("Germany", [
        makeItem("2026-04-17T10:00:00.000Z"),
        makeItem("2030-01-01T10:00:00.000Z"),
      ]),
    ]);
    expect(buildAvailableDatesFromPayload(payload, TODAY)).toEqual(["2026-04-17"]);
  });

  it("excludes items with missing or invalid displayDate", () => {
    const payload = makePayload([
      makeFeed("Germany", [
        makeItem(null),
        makeItem("not-a-date"),
        makeItem("2026-04-10T10:00:00.000Z"),
      ]),
    ]);
    expect(buildAvailableDatesFromPayload(payload, TODAY)).toEqual(["2026-04-10"]);
  });

  it("collects dates across multiple feeds", () => {
    const payload = makePayload([
      makeFeed("Germany", [makeItem("2026-04-15T10:00:00.000Z")]),
      makeFeed("France", [makeItem("2026-04-14T10:00:00.000Z")]),
    ]);
    expect(buildAvailableDatesFromPayload(payload, TODAY)).toEqual(["2026-04-15", "2026-04-14"]);
  });

  it("returns empty array when no valid items", () => {
    expect(buildAvailableDatesFromPayload(makePayload([]), TODAY)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildAvailableDatesByCountry
// ---------------------------------------------------------------------------

describe("buildAvailableDatesByCountry", () => {
  it("returns correct dates per country sorted newest-first", () => {
    const payload = makePayload([
      makeFeed("Germany", [
        makeItem("2026-04-15T10:00:00.000Z"),
        makeItem("2026-04-13T10:00:00.000Z"),
      ]),
      makeFeed("France", [
        makeItem("2026-04-14T10:00:00.000Z"),
      ]),
    ]);
    const result = buildAvailableDatesByCountry(payload, TODAY);
    expect(result.get("Germany")).toEqual(["2026-04-15", "2026-04-13"]);
    expect(result.get("France")).toEqual(["2026-04-14"]);
  });

  it("excludes items without a country", () => {
    const payload = makePayload([
      { country: null, items: [makeItem("2026-04-15T10:00:00.000Z")] },
      makeFeed("Germany", [makeItem("2026-04-14T10:00:00.000Z")]),
    ]);
    const result = buildAvailableDatesByCountry(payload, TODAY);
    expect(result.has(null)).toBe(false);
    expect(result.has("Germany")).toBe(true);
  });

  it("returns empty map when no items", () => {
    const result = buildAvailableDatesByCountry(makePayload([]), TODAY);
    expect(result.size).toBe(0);
  });

  it("excludes future dates", () => {
    const payload = makePayload([
      makeFeed("Germany", [
        makeItem("2026-04-17T10:00:00.000Z"),
        makeItem("2030-01-01T10:00:00.000Z"),
      ]),
    ]);
    const result = buildAvailableDatesByCountry(payload, TODAY);
    expect(result.get("Germany")).toEqual(["2026-04-17"]);
  });
});

// ---------------------------------------------------------------------------
// buildNewspaperDayModel
// ---------------------------------------------------------------------------

function makeItemFull(overrides = {}) {
  return {
    title: "Test title",
    link: "https://example.com/post",
    displayDate: "2026-04-15T10:00:00.000Z",
    resolvedAuthor: "Alice",
    spaceName: "HackerSpace DE",
    country: "Germany",
    normalizedCategories: ["news"],
    summaryText: "Summary text",
    attachments: [],
    ...overrides,
  };
}

const AVAILABLE_DATES = ["2026-04-17", "2026-04-16", "2026-04-15", "2026-04-14"];
const DATES_BY_COUNTRY = new Map([
  ["Germany", ["2026-04-17", "2026-04-15"]],
  ["France", ["2026-04-16", "2026-04-14"]],
]);

describe("buildNewspaperDayModel — sections", () => {
  it("returns sections in canonical order: Events, Projects, Workshops, Community, News, Blogs", () => {
    const model = buildNewspaperDayModel([], "2026-04-15", NOW, null, AVAILABLE_DATES, DATES_BY_COUNTRY);
    expect(model.sections.map((s) => s.label)).toEqual(["Events", "Projects", "Workshops", "Community", "News", "Blogs"]);
  });

  it("places items into correct sections", () => {
    const items = [
      makeItemFull({ normalizedCategories: ["events"] }),
      makeItemFull({ normalizedCategories: ["news"], title: "News item" }),
    ];
    const model = buildNewspaperDayModel(items, "2026-04-15", NOW, null, AVAILABLE_DATES, DATES_BY_COUNTRY);
    const byLabel = Object.fromEntries(model.sections.map((s) => [s.label, s]));
    expect(byLabel["Events"].totalItems).toBe(1);
    expect(byLabel["News"].totalItems).toBe(1);
  });

  it("distributes items round-robin into 3 columns", () => {
    const items = [1, 2, 3, 4].map((n) => makeItemFull({ title: `Item ${n}` }));
    const model = buildNewspaperDayModel(items, "2026-04-15", NOW, null, AVAILABLE_DATES, DATES_BY_COUNTRY);
    const newsSection = model.sections.find((s) => s.label === "News");
    expect(newsSection.columns[0].items.length).toBe(2);
    expect(newsSection.columns[1].items.length).toBe(1);
    expect(newsSection.columns[2].items.length).toBe(1);
  });
});

describe("buildNewspaperDayModel — date nav", () => {
  it("labels today as Today", () => {
    const model = buildNewspaperDayModel([], "2026-04-17", NOW, null, AVAILABLE_DATES, DATES_BY_COUNTRY);
    expect(model.nav.current.label).toBe("Today");
  });

  it("labels yesterday as Yesterday", () => {
    const model = buildNewspaperDayModel([], "2026-04-16", NOW, null, AVAILABLE_DATES, DATES_BY_COUNTRY);
    expect(model.nav.current.label).toBe("Yesterday");
  });

  it("formats older date as DD Month", () => {
    const model = buildNewspaperDayModel([], "2026-04-15", NOW, null, AVAILABLE_DATES, DATES_BY_COUNTRY);
    expect(model.nav.current.label).toBe("15 April");
  });

  it("prev points to older date", () => {
    const model = buildNewspaperDayModel([], "2026-04-16", NOW, null, AVAILABLE_DATES, DATES_BY_COUNTRY);
    expect(model.nav.prev.date).toBe("2026-04-15");
  });

  it("next points to newer date", () => {
    const model = buildNewspaperDayModel([], "2026-04-16", NOW, null, AVAILABLE_DATES, DATES_BY_COUNTRY);
    expect(model.nav.next.date).toBe("2026-04-17");
  });

  it("prev is null when at oldest date", () => {
    const model = buildNewspaperDayModel([], "2026-04-14", NOW, null, AVAILABLE_DATES, DATES_BY_COUNTRY);
    expect(model.nav.prev).toBeNull();
  });

  it("next is null when at newest date", () => {
    const model = buildNewspaperDayModel([], "2026-04-17", NOW, null, AVAILABLE_DATES, DATES_BY_COUNTRY);
    expect(model.nav.next).toBeNull();
  });
});

describe("buildNewspaperDayModel — dateHrefBase", () => {
  it("dateHrefBase is ../ for all-countries page (depth 1)", () => {
    const model = buildNewspaperDayModel([], "2026-04-15", NOW, null, AVAILABLE_DATES, DATES_BY_COUNTRY);
    expect(model.dateHrefBase).toBe("../");
  });

  it("dateHrefBase is ../../ for country page (depth 2)", () => {
    const model = buildNewspaperDayModel([], "2026-04-15", NOW, "Germany", AVAILABLE_DATES, DATES_BY_COUNTRY);
    expect(model.dateHrefBase).toBe("../../");
  });
});

describe("buildNewspaperDayModel — cssHref", () => {
  it("cssHref is /static/newspaper.css", () => {
    const model = buildNewspaperDayModel([], "2026-04-15", NOW, null, AVAILABLE_DATES, DATES_BY_COUNTRY);
    expect(model.cssHref).toBe("/static/newspaper.css");
  });
});

describe("buildNewspaperDayModel — item mapping", () => {
  it("maps countryFlag and countryName onto items", () => {
    const items = [makeItemFull({ country: "Germany" })];
    const model = buildNewspaperDayModel(items, "2026-04-15", NOW, null, AVAILABLE_DATES, DATES_BY_COUNTRY);
    const newsItems = model.sections.find((s) => s.label === "News").columns.flatMap((c) => c.items);
    expect(newsItems[0].countryFlag).toBe("🇩🇪");
    expect(newsItems[0].countryName).toBe("Germany");
  });

  it("picks imageUrl from first image attachment", () => {
    const items = [makeItemFull({
      attachments: [
        { type: "application/pdf", url: "https://example.com/doc.pdf" },
        { type: "image/jpeg", url: "https://example.com/photo.jpg" },
      ],
    })];
    const model = buildNewspaperDayModel(items, "2026-04-15", NOW, null, AVAILABLE_DATES, DATES_BY_COUNTRY);
    const newsItems = model.sections.find((s) => s.label === "News").columns.flatMap((c) => c.items);
    expect(newsItems[0].imageUrl).toBe("https://example.com/photo.jpg");
  });

  it("sets summaryText to null when absent", () => {
    const items = [makeItemFull({ summaryText: undefined })];
    const model = buildNewspaperDayModel(items, "2026-04-15", NOW, null, AVAILABLE_DATES, DATES_BY_COUNTRY);
    const newsItems = model.sections.find((s) => s.label === "News").columns.flatMap((c) => c.items);
    expect(newsItems[0].summaryText).toBeNull();
  });
});

describe("buildNewspaperDayModel — countryOptions", () => {
  it("includes All countries as first option pointing to current date", () => {
    const model = buildNewspaperDayModel([], "2026-04-15", NOW, null, AVAILABLE_DATES, DATES_BY_COUNTRY);
    expect(model.countryOptions[0].label).toBe("All countries");
    expect(model.countryOptions[0].isSelected).toBe(true);
    expect(model.countryOptions[0].href).toContain("2026-04-15");
  });

  it("each country option links to its most recent available date", () => {
    const model = buildNewspaperDayModel([], "2026-04-15", NOW, null, AVAILABLE_DATES, DATES_BY_COUNTRY);
    const germany = model.countryOptions.find((o) => o.label === "Germany");
    expect(germany.href).toContain("2026-04-17");
  });

  it("selected country option is marked isSelected", () => {
    const model = buildNewspaperDayModel([], "2026-04-15", NOW, "Germany", AVAILABLE_DATES, DATES_BY_COUNTRY);
    const germany = model.countryOptions.find((o) => o.label === "Germany");
    expect(germany.isSelected).toBe(true);
    expect(model.countryOptions[0].isSelected).toBe(false);
  });
});
