import { describe, expect, it } from "vitest";

import { getCountryFeedHref, getCountryFeedOutputPath } from "../../../src/countryFeeds.js";
import {
  buildCountryFeedContext,
  buildCountryFeedModel,
  listCountryFeeds,
  listCountryFeedOptions,
} from "../../../src/viewModels/countryFeeds.js";
import {
  buildFeedSectionContext,
  buildFeedSectionNavItems,
} from "../../../src/viewModels/feedSections.js";

const normalizedPayload = {
  generatedAt: "2026-03-19T20:00:00.000Z",
  sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
  summary: {
    sourceRows: 4,
    validFeeds: 4,
    parsedFeeds: 3,
    emptyFeeds: 1,
    failedFeeds: 0,
  },
  feeds: [
    {
      id: "row-1-betamachine",
      rowNumber: 1,
      sourceWikiUrl: "https://wiki.hackerspaces.org/BetaMachine",
      finalFeedUrl: "https://www.betamachine.fr/feed/",
      siteUrl: "https://www.betamachine.fr",
      spaceName: "BetaMachine",
      country: "France",
      feedType: "rss",
      status: "parsed_ok",
      items: [
        {
          id: "fr-1",
          title: "French newest",
          displayDate: "2025-01-03T10:00:00.000Z",
        },
        {
          id: "fr-2",
          title: "French older",
          displayDate: "2025-01-01T10:00:00.000Z",
        },
      ],
    },
    {
      id: "row-2-c3d2",
      rowNumber: 2,
      sourceWikiUrl: "https://wiki.hackerspaces.org/C3D2",
      finalFeedUrl: "https://c3d2.de/news-atom.xml",
      siteUrl: "https://c3d2.de",
      spaceName: "C3D2",
      country: "Germany",
      feedType: "atom",
      status: "parsed_ok",
      items: [
        {
          id: "de-1",
          title: "German post",
          displayDate: "2025-01-02T10:00:00.000Z",
        },
      ],
    },
    {
      id: "row-3-empty-france",
      rowNumber: 3,
      sourceWikiUrl: "https://wiki.hackerspaces.org/Other",
      finalFeedUrl: "https://example.com/empty.xml",
      siteUrl: "https://example.com",
      spaceName: "OtherSpace",
      country: "France",
      feedType: "rss",
      status: "parsed_empty",
      items: [],
    },
    {
      id: "row-4-no-country",
      rowNumber: 4,
      sourceWikiUrl: "https://wiki.hackerspaces.org/NoCountry",
      finalFeedUrl: "https://example.com/no-country.xml",
      siteUrl: "https://example.com/no-country",
      spaceName: "NoCountry",
      feedType: "rss",
      status: "parsed_ok",
      items: [
        {
          id: "nc-1",
          title: "No country post",
          displayDate: "2025-01-04T10:00:00.000Z",
        },
      ],
    },
  ],
  failures: [],
};

describe("country feed contracts", () => {
  it("lists stable country selector options from feeds with visible items", () => {
    expect(listCountryFeedOptions(normalizedPayload, "feed")).toEqual([
      { label: "All countries", href: "/feed/index.html", isSelected: true },
      { label: "France", href: "/feed/countries/france/index.html", isSelected: false },
      { label: "Germany", href: "/feed/countries/germany/index.html", isSelected: false },
    ]);
  });

  it("builds a paginated country feed model without adding country pages to the section nav", () => {
    const model = buildCountryFeedModel(normalizedPayload, "feed", "france");

    expect(model.pageTitle).toBe("News · France");
    expect(model.pageIntro).toBe("All publications sorted from new to old.");
    expect(model.items.map((item) => item.title)).toEqual(["French newest", "French older"]);
    expect(model.streamNavItems[0]).toEqual({
      href: "/feed/index.html",
      label: "News",
      isCurrent: true,
    });
    expect(model.streamNavItems.some((item) => item.href.includes("/feed/countries/"))).toBe(false);
    expect(model.streamNavItems.at(-1)).toEqual({
      href: "/authors/index.html",
      label: "Authors",
      isCurrent: false,
    });
    expect(model.countryOptions).toEqual([
      { label: "All countries", href: "/feed/index.html", isSelected: false },
      { label: "France", href: "/feed/countries/france/index.html", isSelected: true },
      { label: "Germany", href: "/feed/countries/germany/index.html", isSelected: false },
    ]);
    expect(model.previousPageHref).toBeUndefined();
  });

  it("builds per-section country selector options and models for category pages", () => {
    const payload = {
      ...normalizedPayload,
      feeds: [
        {
          ...normalizedPayload.feeds[0],
          items: [
            {
              id: "fr-event",
              title: "French event",
              displayDate: "2025-01-03T10:00:00.000Z",
              normalizedCategories: ["events"],
            },
            {
              id: "fr-blog",
              title: "French blog",
              displayDate: "2025-01-01T10:00:00.000Z",
              normalizedCategories: ["blogs"],
            },
          ],
        },
        {
          ...normalizedPayload.feeds[1],
          items: [
            {
              id: "de-event",
              title: "German event",
              displayDate: "2025-01-02T10:00:00.000Z",
              normalizedCategories: ["events"],
            },
          ],
        },
      ],
    };
    const feedSectionContext = buildFeedSectionContext(payload);
    const countryContext = buildCountryFeedContext(payload, { feedSectionContext });

    expect(listCountryFeeds(payload, { context: countryContext, sectionId: "events" })).toEqual([
      {
        country: "France",
        slug: "france",
        href: "/events/countries/france/index.html",
      },
      {
        country: "Germany",
        slug: "germany",
        href: "/events/countries/germany/index.html",
      },
    ]);

    expect(listCountryFeedOptions(payload, "events", "france", { context: countryContext })).toEqual([
      { label: "All countries", href: "/events/index.html", isSelected: false },
      { label: "France", href: "/events/countries/france/index.html", isSelected: true },
      { label: "Germany", href: "/events/countries/germany/index.html", isSelected: false },
    ]);

    const model = buildCountryFeedModel(payload, "events", "france", { context: countryContext });
    expect(model.pageTitle).toBe("Events · France");
    expect(model.pageIntro).toBe("Items tagged as events.");
    expect(model.items.map((item) => item.title)).toEqual(["French event"]);
    expect(model.streamNavItems).toEqual(
      buildFeedSectionNavItems(countryContext.feedSectionContext.availableSections, "events"),
    );
    expect(model.countryOptions[0]).toEqual({
      label: "All countries",
      href: "/events/index.html",
      isSelected: false,
    });
  });

  it("reuses shared feed-section context for country feeds when provided", () => {
    const feedSectionContext = buildFeedSectionContext(normalizedPayload);
    const countryContext = buildCountryFeedContext(normalizedPayload, { feedSectionContext });

    expect(countryContext.itemsBySectionIdByCountry.get("feed")?.get("France")?.map((item) => item.title)).toEqual([
      "French newest",
      "French older",
    ]);
    expect(countryContext.itemsBySectionIdByCountry.get("feed")?.get("Germany")?.map((item) => item.title)).toEqual([
      "German post",
    ]);

    expect(listCountryFeedOptions(normalizedPayload, "feed", null, { context: countryContext })).toEqual([
      { label: "All countries", href: "/feed/index.html", isSelected: true },
      { label: "France", href: "/feed/countries/france/index.html", isSelected: false },
      { label: "Germany", href: "/feed/countries/germany/index.html", isSelected: false },
    ]);

    const model = buildCountryFeedModel(normalizedPayload, "feed", "france", { context: countryContext });
    expect(model.items.map((item) => item.title)).toEqual(["French newest", "French older"]);
    expect(model.countryOptions[1]).toEqual({
      label: "France",
      href: "/feed/countries/france/index.html",
      isSelected: true,
    });
  });

  it("uses stable href and output path contracts for country pages", () => {
    expect(getCountryFeedHref("feed", "France")).toBe("/feed/countries/france/index.html");
    expect(getCountryFeedHref("events", "France")).toBe("/events/countries/france/index.html");
    expect(getCountryFeedHref("feed", "France", 2)).toBe("/feed/countries/france/page/2/");
    expect(getCountryFeedOutputPath("feed", "France")).toBe("feed/countries/france/index.html");
    expect(getCountryFeedOutputPath("events", "France", 2)).toBe("events/countries/france/page/2/index.html");
  });
});
