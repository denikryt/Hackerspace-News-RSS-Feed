import { describe, expect, it } from "vitest";

import { buildGlobalFeedModel } from "../src/viewModels/globalFeed.js";
import { buildSpaceDetailModel } from "../src/viewModels/spaceDetail.js";
import { buildSpacesIndexModel } from "../src/viewModels/spacesIndex.js";

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
  it("builds spaces index cards with latest post and failed feed cards", () => {
    const model = buildSpacesIndexModel(normalizedPayload);

    expect(model.cards).toHaveLength(3);
    expect(model.cards[0]).toMatchObject({
      spaceName: "Akiba",
      status: "error",
      latestItemTitle: undefined,
    });
    expect(model.cards[1]).toMatchObject({
      spaceName: "BetaMachine",
      status: "parsed_ok",
      latestItemTitle: "Newest post",
      latestItemDate: "2025-01-02T10:00:00.000Z",
    });
    expect(model.cards[1].detailHref).toBe("/spaces/betamachine.html");
  });

  it("builds a detail model with items sorted newest first", () => {
    const model = buildSpaceDetailModel(normalizedPayload, "betamachine");

    expect(model.spaceName).toBe("BetaMachine");
    expect(model.items.map((item) => item.title)).toEqual(["Newest post", "Older post"]);
  });

  it("builds a global feed model sorted by date descending", () => {
    const model = buildGlobalFeedModel(normalizedPayload);

    expect(model.items).toHaveLength(2);
    expect(model.items[0]).toMatchObject({
      title: "Newest post",
      spaceName: "BetaMachine",
      spaceHref: "/spaces/betamachine.html",
    });
    expect(model.items[1].title).toBe("Older post");
  });
});
