import { describe, expect, it } from "vitest";

import { renderSpacesIndex } from "../src/renderers/renderSpacesIndex.js";

describe("renderSpacesIndex", () => {
  it("renders controls for failed feed visibility and card order with localStorage persistence", () => {
    const html = renderSpacesIndex({
      sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
      summary: {
        sourceRows: 3,
        validFeeds: 2,
        parsedFeeds: 1,
        emptyFeeds: 1,
        failedFeeds: 1,
      },
      sortMode: "alphabetical",
      showFailed: false,
      selectedCountry: "all",
      availableCountries: ["France", "Germany", "Russian Federation"],
      cards: [
        {
          spaceName: "Akiba",
          country: "Russian Federation",
          sourceWikiUrl: "https://wiki.hackerspaces.org/Akiba",
          feedUrl: "https://t.me/akiba_space",
          status: "error",
          isVisibleByDefault: false,
          isFailure: true,
          detailHref: "/spaces/akiba.html",
        },
        {
          spaceName: "BetaMachine",
          country: "France",
          sourceWikiUrl: "https://wiki.hackerspaces.org/BetaMachine",
          feedUrl: "https://www.betamachine.fr/feed/",
          status: "parsed_ok",
          isVisibleByDefault: true,
          isFailure: false,
          latestItemTitle: "Newest post",
          latestItemDate: "2025-01-02T10:00:00.000Z",
          detailHref: "/spaces/betamachine.html",
        },
      ],
      visibleCards: [],
    });

    expect(html).toContain("Show failed feeds");
    expect(html).toContain("Country");
    expect(html).toContain("All countries");
    expect(html).toContain("Russian Federation");
    expect(html).toContain("Sort cards");
    expect(html).toContain("Latest publication");
    expect(html).toContain("localStorage");
    expect(html).toContain("hackerspace-news-feed.country");
    expect(html).toContain("data-is-failure=\"true\"");
    expect(html).toContain("data-country=\"France\"");
    expect(html).toContain("data-latest-item-date=\"2025-01-02T10:00:00.000Z\"");
  });
});
