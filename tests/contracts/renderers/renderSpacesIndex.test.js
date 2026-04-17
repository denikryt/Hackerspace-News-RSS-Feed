import { describe, expect, it } from "vitest";

import { renderSpacesIndex } from "../../../src/renderers/renderSpacesIndex.js";

describe("renderSpacesIndex", () => {
  it("renders controls for failed feed visibility and card order with localStorage persistence", () => {
    const html = renderSpacesIndex({
      generatedAt: "2026-03-19T20:00:00.000Z",
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
      searchQuery: "beta",
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
          publicationsCount: 12,
          latestItemTitle: "Newest post",
          latestItemDate: "2025-01-02T10:00:00.000Z",
          detailHref: "/spaces/betamachine.html",
        },
      ],
      visibleCards: [],
    });

    expect(html).toContain("Show failed feeds");
    expect(html).toContain('id="space-search-input"');
    expect(html).toContain('aria-label="Search hackerspaces"');
    expect(html).toContain('class="control-input"');
    expect(html).toContain('value="beta"');
    expect(html).toContain("Search by hackerspace name");
    expect(html).toContain("All countries");
    expect(html).toContain("Russian Federation");
    expect(html).toContain("Latest publication");
    expect(html).toContain("Publication count");
    expect(html).toContain('<link rel="stylesheet" href="/site.css" />');
    expect(html).toContain('<script src="/spaces-index.js"></script>');
    expect(html).not.toContain("localStorage");
    expect(html).toContain('href="/about/index.html"');
    expect(html).toContain('class="about-link-muted"');
    expect(html).toContain(">About<");
    expect(html).toContain('href="/feed/index.html"');
    expect(html).toContain(">News<");
    expect(html).toContain('href="/authors/index.html"');
    expect(html).toContain("Last updated:");
    expect(html).toContain('data-updated-at="2026-03-19T20:00:00.000Z"');
    expect(html).not.toContain("Source page:");
    expect(html).toContain('class="panel page-header page-header--wide page-header--compact"');
    expect(html).toContain('class="panel page-summary page-summary--home"');
    expect(html).toContain('class="spaces-controls"');
    expect(html).toContain('class="spaces-control spaces-control-search"');
    expect(html).toContain('class="spaces-control spaces-control-country"');
    expect(html).toContain('class="spaces-control spaces-control-sort"');
    expect(html).toContain('class="spaces-control spaces-control-toggle"');
    expect(html).toContain('class="page-nav page-nav--wide page-nav--compact"');
    expect(html).not.toContain(".page-nav--wide .section-nav { margin-bottom: 0; border-bottom: 0; }");
    expect(html).toContain("data-is-failure=\"true\"");
    expect(html).toContain("data-space-name=\"BetaMachine\"");
    expect(html).toContain("data-country=\"France\"");
    expect(html).toContain("data-latest-item-date=\"2025-01-02T10:00:00.000Z\"");
    expect(html).toContain("data-publication-count=\"12\"");
    expect(html).toContain("12 publications");
    expect(html.indexOf("12 publications")).toBeLessThan(html.indexOf("Latest:"));
    expect(html).not.toContain("undefined publications");
    expect(html).not.toContain(">Search hackerspaces<");
    expect(html).not.toContain(">Sort cards<");
  });
});
