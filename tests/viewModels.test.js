import { describe, expect, it } from "vitest";

import { buildGlobalFeedModel } from "../src/viewModels/globalFeed.js";
import { buildSpaceDetailModel } from "../src/viewModels/spaceDetail.js";
import { buildSpacesIndexModel } from "../src/viewModels/spacesIndex.js";
import { filterNormalizedPayloadForDisplay } from "../src/visibleData.js";

const normalizedPayload = {
  generatedAt: "2026-03-19T20:00:00.000Z",
  sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
  summary: {
    sourceRows: 3,
    validFeeds: 2,
    parsedFeeds: 1,
    emptyFeeds: 1,
    failedFeeds: 1,
  },
  feeds: [
    {
      id: "row-2-betamachine",
      rowNumber: 2,
      sourceWikiUrl: "https://wiki.hackerspaces.org/BetaMachine",
      finalFeedUrl: "https://www.betamachine.fr/feed/",
      siteUrl: "https://www.betamachine.fr",
      spaceName: "BetaMachine",
      country: "France",
      feedType: "rss",
      status: "parsed_ok",
      items: [
        {
          id: "b-1",
          title: "Newest post",
          link: "https://www.betamachine.fr/newest",
          publishedAt: "2025-01-02T10:00:00.000Z",
          summary: "Newest summary",
        },
        {
          id: "b-future",
          title: "Future post",
          link: "https://www.betamachine.fr/future",
          publishedAt: "2034-07-28T18:00:00.000Z",
        },
        {
          id: "b-2",
          title: "Older post",
          link: "https://www.betamachine.fr/older",
          publishedAt: "2025-01-01T10:00:00.000Z",
        },
      ],
    },
    {
      id: "row-3-c3d2",
      rowNumber: 3,
      sourceWikiUrl: "https://wiki.hackerspaces.org/C3D2",
      finalFeedUrl: "https://c3d2.de/news-atom.xml",
      siteUrl: "https://c3d2.de",
      spaceName: "C3D2",
      country: "Germany",
      feedType: "atom",
      status: "parsed_empty",
      items: [],
    },
  ],
  failures: [
    {
      rowNumber: 1,
      hackerspaceName: "Akiba",
      country: "Russian Federation",
      sourceWikiUrl: "https://wiki.hackerspaces.org/Akiba",
      candidateUrl: "https://t.me/akiba_space",
      errorCode: "non_feed_html",
      errorMessage: "HTML page",
    },
  ],
};

describe("multi-page view models", () => {
  const filteredPayload = filterNormalizedPayloadForDisplay(normalizedPayload, {
    now: Date.parse("2026-03-19T12:00:00.000Z"),
  });

  it("builds spaces index cards hidden-failed by default and sorted alphabetically", () => {
    const model = buildSpacesIndexModel(filteredPayload);

    expect(model.sortMode).toBe("alphabetical");
    expect(model.showFailed).toBe(false);
    expect(model.cards).toHaveLength(3);
    expect(model.visibleCards.map((card) => card.spaceName)).toEqual(["BetaMachine", "C3D2"]);
    expect(model.cards.find((card) => card.spaceName === "Akiba")).toMatchObject({
      status: "error",
      isVisibleByDefault: false,
    });
    expect(model.cards.find((card) => card.spaceName === "BetaMachine")).toMatchObject({
      spaceName: "BetaMachine",
      status: "parsed_ok",
      latestItemTitle: "Newest post",
      latestItemDate: "2025-01-02T10:00:00.000Z",
    });
    expect(model.cards.find((card) => card.spaceName === "BetaMachine").detailHref).toBe(
      "/spaces/betamachine.html",
    );
  });

  it("builds spaces index cards sorted by latest publication when requested", () => {
    const payload = {
      ...filteredPayload,
      feeds: [
        ...filteredPayload.feeds,
        {
          id: "row-4-alfa",
          rowNumber: 4,
          sourceWikiUrl: "https://wiki.hackerspaces.org/Alfa",
          finalFeedUrl: "https://alfa.example/feed.xml",
          siteUrl: "https://alfa.example",
          spaceName: "Alfa",
          country: "Austria",
          feedType: "rss",
          status: "parsed_ok",
          items: [{ title: "Alfa item", publishedAt: "2025-01-03T10:00:00.000Z" }],
        },
      ],
    };

    const model = buildSpacesIndexModel(payload, { sortMode: "latest-publication" });

    expect(model.visibleCards.map((card) => card.spaceName)).toEqual([
      "Alfa",
      "BetaMachine",
      "C3D2",
    ]);
  });

  it("builds a detail model with items sorted newest first", () => {
    const model = buildSpaceDetailModel(filteredPayload, "betamachine");

    expect(model.spaceName).toBe("BetaMachine");
    expect(model.items.map((item) => item.title)).toEqual(["Newest post", "Older post"]);
  });

  it("builds a global feed model sorted by date descending", () => {
    const model = buildGlobalFeedModel(filteredPayload);

    expect(model.items).toHaveLength(2);
    expect(model.items[0]).toMatchObject({
      title: "Newest post",
      spaceName: "BetaMachine",
      spaceHref: "/spaces/betamachine.html",
    });
    expect(model.items[1].title).toBe("Older post");
  });

  it("builds a paginated global feed model with page links", () => {
    const payload = {
      ...filteredPayload,
      feeds: [
        {
          ...filteredPayload.feeds[0],
          items: Array.from({ length: 12 }, (_, index) => ({
            id: `item-${index + 1}`,
            title: `Post ${index + 1}`,
            publishedAt: `2025-01-${String(12 - index).padStart(2, "0")}T10:00:00.000Z`,
          })),
        },
      ],
    };

    const model = buildGlobalFeedModel(payload, { currentPage: 2, pageSize: 10 });

    expect(model.currentPage).toBe(2);
    expect(model.totalPages).toBe(2);
    expect(model.items).toHaveLength(2);
    expect(model.hasPreviousPage).toBe(true);
    expect(model.hasNextPage).toBe(false);
    expect(model.previousPageHref).toBe("/feed/");
    expect(model.pageLinks).toEqual([
      { type: "page", page: 1, href: "/feed/", isCurrent: false },
      { type: "page", page: 2, href: "/feed/page/2/", isCurrent: true },
    ]);
  });
});
