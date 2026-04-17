import { describe, expect, it } from "vitest";

import {
  assignSection,
  buildAvailableDates,
  buildDateNav,
  distributeIntoColumns,
  groupBySection,
} from "../../scripts/prototype-newspaper-page.mjs";

// --- assignSection ---

describe("assignSection", () => {
  it("maps events category to Events", () => {
    expect(assignSection({ normalizedCategories: ["events"] })).toBe("Events");
  });

  it("maps projects category to Projects", () => {
    expect(assignSection({ normalizedCategories: ["projects"] })).toBe("Projects");
  });

  it("maps community category to Community", () => {
    expect(assignSection({ normalizedCategories: ["community"] })).toBe("Community");
  });

  it("maps workshops category to Workshops", () => {
    expect(assignSection({ normalizedCategories: ["workshops"] })).toBe("Workshops");
  });

  it("maps news category to News", () => {
    expect(assignSection({ normalizedCategories: ["news"] })).toBe("News");
  });

  it("maps blogs category to Blogs", () => {
    expect(assignSection({ normalizedCategories: ["blogs"] })).toBe("Blogs");
  });

  it("maps uncategorized to News", () => {
    expect(assignSection({ normalizedCategories: ["uncategorized"] })).toBe("News");
  });

  it("falls back to News when no categories", () => {
    expect(assignSection({ normalizedCategories: [] })).toBe("News");
    expect(assignSection({})).toBe("News");
  });

  it("prefers specific section over news when both are present", () => {
    expect(assignSection({ normalizedCategories: ["news", "workshops"] })).toBe("Workshops");
    expect(assignSection({ normalizedCategories: ["news", "events"] })).toBe("Events");
    expect(assignSection({ normalizedCategories: ["uncategorized", "projects"] })).toBe("Projects");
  });

  it("uses first specific category when multiple specific ones are present", () => {
    expect(assignSection({ normalizedCategories: ["events", "workshops"] })).toBe("Events");
    expect(assignSection({ normalizedCategories: ["projects", "events"] })).toBe("Projects");
  });

  it("falls back to news when all categories are generic", () => {
    expect(assignSection({ normalizedCategories: ["news", "uncategorized"] })).toBe("News");
  });
});

// --- groupBySection ---

describe("groupBySection", () => {
  it("produces six sections in canonical order", () => {
    const result = groupBySection([]);
    expect(result.map((s) => s.label)).toEqual(["Events", "Projects", "Workshops", "Community", "News", "Blogs"]);
  });

  it("places items into correct sections", () => {
    const items = [
      { normalizedCategories: ["events"], title: "Event A" },
      { normalizedCategories: ["projects"], title: "Project B" },
      { normalizedCategories: ["news"], title: "News C" },
      { normalizedCategories: ["community"], title: "Community D" },
      { normalizedCategories: ["workshops"], title: "Workshop E" },
      { normalizedCategories: ["blogs"], title: "Blog F" },
    ];
    const result = groupBySection(items);
    const byLabel = Object.fromEntries(result.map((s) => [s.label, s.items]));

    expect(byLabel["Events"].map((i) => i.title)).toEqual(["Event A"]);
    expect(byLabel["Projects"].map((i) => i.title)).toEqual(["Project B"]);
    expect(byLabel["Community"].map((i) => i.title)).toEqual(["Community D"]);
    expect(byLabel["Workshops"].map((i) => i.title)).toEqual(["Workshop E"]);
    expect(byLabel["News"].map((i) => i.title)).toEqual(["News C"]);
    expect(byLabel["Blogs"].map((i) => i.title)).toEqual(["Blog F"]);
  });

  it("returns empty items array for sections with no matching items", () => {
    const items = [{ normalizedCategories: ["events"], title: "Only Event" }];
    const result = groupBySection(items);
    const byLabel = Object.fromEntries(result.map((s) => [s.label, s.items]));

    expect(byLabel["Projects"]).toEqual([]);
    expect(byLabel["News"]).toEqual([]);
    expect(byLabel["Blogs"]).toEqual([]);
  });
});

// --- buildAvailableDates ---

describe("buildAvailableDates", () => {
  it("returns unique dates that have at least one item, sorted newest first", () => {
    const items = [
      { displayDate: "2026-04-10T10:00:00.000Z" },
      { displayDate: "2026-04-12T10:00:00.000Z" },
      { displayDate: "2026-04-10T15:00:00.000Z" },
      { displayDate: "2026-04-11T08:00:00.000Z" },
    ];
    // today passed so future filtering doesn't affect this set
    const today = "2026-04-13";
    const result = buildAvailableDates(items, today);
    expect(result).toEqual(["2026-04-12", "2026-04-11", "2026-04-10"]);
  });

  it("excludes future dates beyond today", () => {
    const items = [
      { displayDate: "2026-04-12T10:00:00.000Z" },
      { displayDate: "2030-01-01T10:00:00.000Z" }, // far future
    ];
    const today = "2026-04-13";
    const result = buildAvailableDates(items, today);
    expect(result).toEqual(["2026-04-12"]);
  });

  it("excludes items with missing or invalid displayDate", () => {
    const items = [
      { displayDate: null },
      { displayDate: "not-a-date" },
      { displayDate: "2026-04-10T10:00:00.000Z" },
    ];
    const today = "2026-04-13";
    const result = buildAvailableDates(items, today);
    expect(result).toEqual(["2026-04-10"]);
  });

  it("returns empty array when no valid items", () => {
    const result = buildAvailableDates([], "2026-04-13");
    expect(result).toEqual([]);
  });
});

// --- distributeIntoColumns ---

describe("distributeIntoColumns", () => {
  it("distributes 7 items into 3 columns as [3, 2, 2]", () => {
    const items = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ title: String(n) }));
    const cols = distributeIntoColumns(items, 3);
    expect(cols.map((c) => c.items.length)).toEqual([3, 2, 2]);
  });

  it("distributes 3 items into 3 columns as [1, 1, 1]", () => {
    const items = [1, 2, 3].map((n) => ({ title: String(n) }));
    const cols = distributeIntoColumns(items, 3);
    expect(cols.map((c) => c.items.length)).toEqual([1, 1, 1]);
  });

  it("distributes 1 item into 3 columns as [1, 0, 0]", () => {
    const items = [{ title: "only" }];
    const cols = distributeIntoColumns(items, 3);
    expect(cols.map((c) => c.items.length)).toEqual([1, 0, 0]);
  });

  it("distributes 0 items into 3 empty columns", () => {
    const cols = distributeIntoColumns([], 3);
    expect(cols.map((c) => c.items.length)).toEqual([0, 0, 0]);
  });

  it("assigns items round-robin: item 0 → col 0, item 1 → col 1, item 2 → col 2, item 3 → col 0", () => {
    const items = ["a", "b", "c", "d"].map((t) => ({ title: t }));
    const cols = distributeIntoColumns(items, 3);
    expect(cols[0].items.map((i) => i.title)).toEqual(["a", "d"]);
    expect(cols[1].items.map((i) => i.title)).toEqual(["b"]);
    expect(cols[2].items.map((i) => i.title)).toEqual(["c"]);
  });
});

// --- buildDateNav ---

describe("buildDateNav", () => {
  // Reference point: 2026-04-13 (Monday)
  const NOW = new Date("2026-04-13T12:00:00.000Z");
  const AVAILABLE = ["2026-04-13", "2026-04-12", "2026-04-11", "2026-04-10", "2026-04-09", "2026-04-08", "2026-04-07", "2026-04-06"];

  it("labels current date as Today when it is today", () => {
    const nav = buildDateNav(AVAILABLE, "2026-04-13", NOW);
    expect(nav.current.label).toBe("Today");
  });

  it("labels current date as Yesterday when it is yesterday", () => {
    const nav = buildDateNav(AVAILABLE, "2026-04-12", NOW);
    expect(nav.current.label).toBe("Yesterday");
  });

  it("formats current date as DD Month for older dates", () => {
    const nav = buildDateNav(AVAILABLE, "2026-04-11", NOW);
    expect(nav.current.label).toBe("11 April");
  });

  it("prev points to the older adjacent date", () => {
    const nav = buildDateNav(AVAILABLE, "2026-04-12", NOW);
    expect(nav.prev.date).toBe("2026-04-11");
    expect(nav.prev.label).toBe("11 April");
  });

  it("next points to the newer adjacent date", () => {
    const nav = buildDateNav(AVAILABLE, "2026-04-12", NOW);
    expect(nav.next.date).toBe("2026-04-13");
    expect(nav.next.label).toBe("Today");
  });

  it("prev is null when current is the oldest available date", () => {
    const nav = buildDateNav(AVAILABLE, "2026-04-06", NOW);
    expect(nav.prev).toBeNull();
  });

  it("next is null when current is the newest available date", () => {
    const nav = buildDateNav(AVAILABLE, "2026-04-13", NOW);
    expect(nav.next).toBeNull();
  });

  it("only uses dates present in availableDates for prev/next", () => {
    // gap: 2026-04-12 absent — prev of 2026-04-13 should be 2026-04-11
    const limited = ["2026-04-13", "2026-04-11"];
    const nav = buildDateNav(limited, "2026-04-13", NOW);
    expect(nav.prev.date).toBe("2026-04-11");
    expect(nav.next).toBeNull();
  });
});
