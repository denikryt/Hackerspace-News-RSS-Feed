import { describe, expect, it } from "vitest";

import { renderSpacesIndex } from "../src/renderers/renderSpacesIndex.js";

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
    expect(html).toContain("All countries");
    expect(html).toContain("Russian Federation");
    expect(html).toContain("Latest publication");
    expect(html).toContain("Publication count");
    expect(html).toContain("localStorage");
    expect(html).toContain("hackerspace-news-feed.country");
    expect(html).toContain('href="/about/index.html"');
    expect(html).toContain('class="about-link-muted"');
    expect(html).toContain(">About<");
    expect(html).toContain('href="/feed/index.html"');
    expect(html).toContain(">Feed<");
    expect(html).toContain('href="/authors/index.html"');
    expect(html).toContain("Last updated:");
    expect(html).toContain('data-updated-at="2026-03-19T20:00:00.000Z"');
    expect(html).toContain("Intl.DateTimeFormat");
    expect(html).not.toContain("Source page:");
    expect(html).toContain('class="panel page-header page-header--wide page-header--compact"');
    expect(html).toContain('class="panel page-summary page-summary--home"');
    expect(html).toContain('class="spaces-controls"');
    expect(html).toContain('class="spaces-control spaces-control-country"');
    expect(html).toContain('class="spaces-control spaces-control-sort"');
    expect(html).toContain('class="spaces-control spaces-control-toggle"');
    expect(html).toContain(".spaces-controls{display:grid;");
    expect(html).toContain(".spaces-control-toggle{grid-column:1/-1;}");
    expect(html).toContain("@media (min-width: 761px){.spaces-controls{grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;}");
    expect(html).toContain(".spaces-control-toggle{grid-column:auto;align-self:center;}");
    expect(html).toContain('class="page-nav page-nav--wide page-nav--compact"');
    expect(html).not.toContain(".page-nav--wide .section-nav { margin-bottom: 0; border-bottom: 0; }");
    expect(html).toContain("data-is-failure=\"true\"");
    expect(html).toContain("data-country=\"France\"");
    expect(html).toContain("data-latest-item-date=\"2025-01-02T10:00:00.000Z\"");
    expect(html).toContain("data-publication-count=\"12\"");
    expect(html).toContain(".space-card-publications { margin: 0 0 0.35rem; }");
    expect(html).toContain("12 publications");
    expect(html.indexOf("12 publications")).toBeLessThan(html.indexOf("Latest:"));
    expect(html).not.toContain("undefined publications");
    expect(html).not.toContain(">Sort cards<");
    expect(html).toContain("function comparePublicationCount(left, right)");
    expect(html).toContain('sortMode === "publication-count"');
  });
});
