import { describe, expect, it } from "vitest";

import {
  buildContentStreamContext,
  buildContentStreamModel,
  listContentStreams,
} from "../../../src/viewModels/contentStreams.js";

const normalizedPayload = {
  generatedAt: "2026-03-19T20:00:00.000Z",
  sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
  summary: {
    sourceRows: 2,
    validFeeds: 2,
    parsedFeeds: 2,
    emptyFeeds: 0,
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
          id: "event-1",
          title: "Open night",
          displayDate: "2025-01-04T10:00:00.000Z",
          normalizedCategories: ["event"],
        },
        {
          id: "multi-1",
          title: "Big launch",
          displayDate: "2025-01-03T10:00:00.000Z",
          normalizedCategories: ["event", "news"],
        },
        {
          id: "other-1",
          title: "Space cleanup",
          displayDate: "2025-01-02T10:00:00.000Z",
          normalizedCategories: ["hackerspace"],
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
          id: "blog-1",
          title: "Workshop notes",
          displayDate: "2025-01-01T10:00:00.000Z",
          normalizedCategories: ["blog", "workshop"],
        },
      ],
    },
  ],
  failures: [],
};

describe("content stream contracts", () => {
  it("lists only observed public category streams plus feed and fallback", () => {
    expect(listContentStreams(normalizedPayload)).toEqual([
      { id: "feed", label: "Feed", href: "/feed/index.html", totalItems: 4 },
      { id: "event", label: "Events", href: "/events/index.html", totalItems: 2 },
      { id: "news", label: "News", href: "/news/index.html", totalItems: 1 },
      { id: "blog", label: "Blogs", href: "/blogs/index.html", totalItems: 1 },
      { id: "workshop", label: "Workshops", href: "/workshops/index.html", totalItems: 1 },
      { id: "other", label: "Other", href: "/other/index.html", totalItems: 1 },
    ]);
  });

  it("builds category, feed, and fallback models from normalized categories", () => {
    const feedModel = buildContentStreamModel(normalizedPayload, { streamId: "feed" });
    const eventModel = buildContentStreamModel(normalizedPayload, { streamId: "event" });
    const otherModel = buildContentStreamModel(normalizedPayload, { streamId: "other" });

    expect(feedModel.items.map((item) => item.title)).toEqual([
      "Open night",
      "Big launch",
      "Space cleanup",
      "Workshop notes",
    ]);
    expect(eventModel.items.map((item) => item.title)).toEqual(["Open night", "Big launch"]);
    expect(otherModel.items.map((item) => item.title)).toEqual(["Space cleanup"]);
    expect(otherModel.items[0].normalizedCategories).toEqual(["hackerspace"]);
  });

  it("keeps multi-category items in every allowed stream and excludes them from fallback", () => {
    const newsModel = buildContentStreamModel(normalizedPayload, { streamId: "news" });
    const otherModel = buildContentStreamModel(normalizedPayload, { streamId: "other" });

    expect(newsModel.items.map((item) => item.title)).toEqual(["Big launch"]);
    expect(otherModel.items.map((item) => item.title)).not.toContain("Big launch");
    expect(newsModel.streamNavItems).toEqual([
      { href: "/feed/index.html", label: "Feed", isCurrent: false },
      { href: "/events/index.html", label: "Events", isCurrent: false },
      { href: "/news/index.html", label: "News", isCurrent: true },
      { href: "/blogs/index.html", label: "Blogs", isCurrent: false },
      { href: "/workshops/index.html", label: "Workshops", isCurrent: false },
      { href: "/other/index.html", label: "Other", isCurrent: false },
      { href: "/authors/index.html", label: "Authors", isCurrent: false },
    ]);
  });

  it("reuses a precomputed content-stream context without changing the model output", () => {
    const context = buildContentStreamContext(normalizedPayload);

    expect(listContentStreams(normalizedPayload, { context })).toEqual(
      listContentStreams(normalizedPayload),
    );
    expect(
      buildContentStreamModel(normalizedPayload, { streamId: "feed", context }),
    ).toEqual(
      buildContentStreamModel(normalizedPayload, { streamId: "feed" }),
    );
  });
});
