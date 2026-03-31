import { describe, expect, it } from "vitest";

import { getCountryFeedHref, getCountryFeedOutputPath } from "../src/countryFeeds.js";
import {
  buildCountryFeedModel,
  listCountryFeedOptions,
} from "../src/viewModels/countryFeeds.js";

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
    expect(listCountryFeedOptions(normalizedPayload)).toEqual([
      { label: "All countries", href: "/feed/index.html", isSelected: true },
      { label: "France", href: "/feed/countries/france/index.html", isSelected: false },
      { label: "Germany", href: "/feed/countries/germany/index.html", isSelected: false },
    ]);
  });

  it("builds a paginated country feed model without adding country pages to the stream nav", () => {
    const model = buildCountryFeedModel(normalizedPayload, "france");

    expect(model.pageTitle).toBe("Feed · France");
    expect(model.items.map((item) => item.title)).toEqual(["French newest", "French older"]);
    expect(model.streamNavItems[0]).toEqual({
      href: "/feed/index.html",
      label: "Feed",
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

  it("uses stable href and output path contracts for country pages", () => {
    expect(getCountryFeedHref("France")).toBe("/feed/countries/france/index.html");
    expect(getCountryFeedHref("France", 2)).toBe("/feed/countries/france/page/2/");
    expect(getCountryFeedOutputPath("France")).toBe("feed/countries/france/index.html");
    expect(getCountryFeedOutputPath("France", 2)).toBe("feed/countries/france/page/2/index.html");
  });
});
