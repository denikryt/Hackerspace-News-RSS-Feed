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
        {
          id: "community-1",
          title: "Community meetup",
          displayDate: "2025-01-01T12:00:00.000Z",
          normalizedCategories: ["community"],
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
  it("lists feed plus only those category streams that are actually present in the data", () => {
    const streams = listContentStreams(normalizedPayload);

    expect(streams[0]).toMatchObject({ id: "feed", href: "/feed/index.html", totalItems: 5 });
    expect(streams.map((stream) => stream.id)).toEqual(
      expect.arrayContaining(["community", "event", "news", "blog", "hackerspace", "workshop"]),
    );
    expect(streams.find((stream) => stream.id === "community")).toMatchObject({
      href: "/community/index.html",
      totalItems: 1,
    });
    expect(streams.find((stream) => stream.id === "hackerspace")).toMatchObject({
      href: "/hackerspaces/index.html",
      totalItems: 1,
    });
  });

  it("builds category and feed models from normalized categories", () => {
    const feedModel = buildContentStreamModel(normalizedPayload, { streamId: "feed" });
    const eventModel = buildContentStreamModel(normalizedPayload, { streamId: "event" });
    const hackerspaceModel = buildContentStreamModel(normalizedPayload, { streamId: "hackerspace" });
    const communityModel = buildContentStreamModel(normalizedPayload, { streamId: "community" });

    expect(feedModel.items.map((item) => item.title)).toEqual([
      "Open night",
      "Big launch",
      "Space cleanup",
      "Community meetup",
      "Workshop notes",
    ]);
    expect(eventModel.items.map((item) => item.title)).toEqual(["Open night", "Big launch"]);
    expect(hackerspaceModel.items.map((item) => item.title)).toEqual(["Space cleanup"]);
    expect(communityModel.items.map((item) => item.title)).toEqual(["Community meetup"]);
  });

  it("keeps multi-category items in every allowed stream and includes available stream navigation", () => {
    const newsModel = buildContentStreamModel(normalizedPayload, { streamId: "news" });

    expect(newsModel.items.map((item) => item.title)).toEqual(["Big launch"]);
    expect(newsModel.streamNavItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "/feed/index.html", label: "Feed", isCurrent: false }),
        expect.objectContaining({ href: "/news/index.html", label: "News", isCurrent: true }),
        expect.objectContaining({ href: "/community/index.html", label: "Community", isCurrent: false }),
        expect.objectContaining({ href: "/hackerspaces/index.html", label: "Hackerspaces", isCurrent: false }),
        expect.objectContaining({ href: "/authors/index.html", label: "Authors", isCurrent: false }),
      ]),
    );
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
