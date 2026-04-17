import { describe, expect, it } from "vitest";

import { buildNewspaperFeedPageEntries } from "../../src/renderSitePageBuilders.js";

// ---------------------------------------------------------------------------
// Fixture normalizedPayload
// ---------------------------------------------------------------------------

const TODAY = "2026-04-17";

const FIXTURE_PAYLOAD = {
  generatedAt: "2026-04-17T12:00:00.000Z",
  feeds: [
    {
      id: "feed-de",
      spaceName: "HackerSpace DE",
      country: "Germany",
      status: "parsed_ok",
      items: [
        {
          id: "de-1",
          title: "German post on 15th",
          link: "https://example.com/de-1",
          displayDate: "2026-04-15T10:00:00.000Z",
          normalizedCategories: ["news"],
          resolvedAuthor: "Alice",
          summaryText: null,
          attachments: [],
        },
        {
          id: "de-2",
          title: "German post on 14th",
          link: "https://example.com/de-2",
          displayDate: "2026-04-14T10:00:00.000Z",
          normalizedCategories: ["news"],
          resolvedAuthor: "Bob",
          summaryText: null,
          attachments: [],
        },
      ],
    },
    {
      id: "feed-fr",
      spaceName: "HackerSpace FR",
      country: "France",
      status: "parsed_ok",
      items: [
        {
          id: "fr-1",
          title: "French post on 15th",
          link: "https://example.com/fr-1",
          displayDate: "2026-04-15T08:00:00.000Z",
          normalizedCategories: ["events"],
          resolvedAuthor: null,
          summaryText: "French event summary",
          attachments: [],
        },
      ],
    },
  ],
};

const CONTEXT = { today: TODAY, now: new Date("2026-04-17T12:00:00.000Z") };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildNewspaperFeedPageEntries", () => {
  it("returns an array of [outputPath, html] pairs", () => {
    const entries = buildNewspaperFeedPageEntries(FIXTURE_PAYLOAD, CONTEXT);
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
    for (const [path, html] of entries) {
      expect(typeof path).toBe("string");
      expect(typeof html).toBe("string");
    }
  });

  it("produces all-countries page for each date with items", () => {
    const entries = buildNewspaperFeedPageEntries(FIXTURE_PAYLOAD, CONTEXT);
    const paths = entries.map(([p]) => p);
    expect(paths).toContain("feed/2026-04-15/index.html");
    expect(paths).toContain("feed/2026-04-14/index.html");
  });

  it("does not produce page for date with no items", () => {
    const entries = buildNewspaperFeedPageEntries(FIXTURE_PAYLOAD, CONTEXT);
    const paths = entries.map(([p]) => p);
    // 2026-04-16 has no items in fixture
    expect(paths).not.toContain("feed/2026-04-16/index.html");
  });

  it("produces per-country page for each date × country with items", () => {
    const entries = buildNewspaperFeedPageEntries(FIXTURE_PAYLOAD, CONTEXT);
    const paths = entries.map(([p]) => p);
    expect(paths).toContain("feed/2026-04-15/Germany/index.html");
    expect(paths).toContain("feed/2026-04-15/France/index.html");
    expect(paths).toContain("feed/2026-04-14/Germany/index.html");
  });

  it("does not produce country page for date where that country has no items", () => {
    const entries = buildNewspaperFeedPageEntries(FIXTURE_PAYLOAD, CONTEXT);
    const paths = entries.map(([p]) => p);
    // France has no item on 2026-04-14
    expect(paths).not.toContain("feed/2026-04-14/France/index.html");
  });

  it("produces feed/index.html redirect page", () => {
    const entries = buildNewspaperFeedPageEntries(FIXTURE_PAYLOAD, CONTEXT);
    const paths = entries.map(([p]) => p);
    expect(paths).toContain("feed/index.html");
  });

  it("feed/index.html contains meta refresh redirect to latest date", () => {
    const entries = buildNewspaperFeedPageEntries(FIXTURE_PAYLOAD, CONTEXT);
    const redirectEntry = entries.find(([p]) => p === "feed/index.html");
    expect(redirectEntry).toBeDefined();
    const html = redirectEntry[1];
    expect(html).toContain('<meta http-equiv="refresh"');
    expect(html).toContain("2026-04-15");
  });

  it("all-countries HTML contains items from both countries on that date", () => {
    const entries = buildNewspaperFeedPageEntries(FIXTURE_PAYLOAD, CONTEXT);
    const allCountries15 = entries.find(([p]) => p === "feed/2026-04-15/index.html");
    expect(allCountries15).toBeDefined();
    const html = allCountries15[1];
    expect(html).toContain("German post on 15th");
    expect(html).toContain("French post on 15th");
  });

  it("country page contains only items for that country", () => {
    const entries = buildNewspaperFeedPageEntries(FIXTURE_PAYLOAD, CONTEXT);
    const de15 = entries.find(([p]) => p === "feed/2026-04-15/Germany/index.html");
    expect(de15).toBeDefined();
    const html = de15[1];
    expect(html).toContain("German post on 15th");
    expect(html).not.toContain("French post on 15th");
  });
});
