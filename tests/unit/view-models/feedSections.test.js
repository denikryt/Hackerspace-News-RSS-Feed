import { describe, expect, it } from "vitest";

import {
  buildFeedSectionContext,
  buildFeedSectionModel,
  listFeedSections,
} from "../../../src/viewModels/feedSections.js";

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
          normalizedCategories: ["events"],
        },
        {
          id: "multi-1",
          title: "Big launch",
          displayDate: "2025-01-03T10:00:00.000Z",
          normalizedCategories: ["events", "news"],
        },
        {
          id: "other-1",
          title: "Space cleanup",
          displayDate: "2025-01-02T10:00:00.000Z",
          normalizedCategories: ["community"],
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
          normalizedCategories: ["blogs", "workshops"],
        },
      ],
    },
  ],
  failures: [],
};

describe("feed section contracts", () => {
  it("lists feed plus only those category sections that are actually present in the data", () => {
    const sections = listFeedSections(normalizedPayload);

    expect(sections[0]).toMatchObject({ id: "feed", href: "/feed/index.html", totalItems: 5 });
    expect(sections.map((section) => section.id)).toEqual(
      expect.arrayContaining(["community", "events", "news", "blogs", "workshops"]),
    );
    expect(sections.find((section) => section.id === "community")).toMatchObject({
      href: "/community/index.html",
      totalItems: 2,
    });
  });

  it("builds category and feed models from normalized categories", () => {
    const feedModel = buildFeedSectionModel(normalizedPayload, { sectionId: "feed" });
    const eventsModel = buildFeedSectionModel(normalizedPayload, { sectionId: "events" });
    const communityModel = buildFeedSectionModel(normalizedPayload, { sectionId: "community" });

    expect(feedModel.items.map((item) => item.title)).toEqual([
      "Open night",
      "Big launch",
      "Space cleanup",
      "Community meetup",
      "Workshop notes",
    ]);
    expect(eventsModel.items.map((item) => item.title)).toEqual(["Open night", "Big launch"]);
    expect(communityModel.items.map((item) => item.title)).toEqual([
      "Space cleanup",
      "Community meetup",
    ]);
  });

  it("keeps multi-category items in every allowed section and includes available section navigation", () => {
    const newsModel = buildFeedSectionModel(normalizedPayload, { sectionId: "news" });

    expect(newsModel.items.map((item) => item.title)).toEqual(["Big launch"]);
    expect(newsModel.streamNavItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "/feed/index.html", label: "Feed", isCurrent: false }),
        expect.objectContaining({ href: "/news/index.html", label: "News", isCurrent: true }),
        expect.objectContaining({ href: "/community/index.html", label: "Community", isCurrent: false }),
        expect.objectContaining({ href: "/workshops/index.html", label: "Workshops", isCurrent: false }),
        expect.objectContaining({ href: "/authors/index.html", label: "Authors", isCurrent: false }),
      ]),
    );
    expect(newsModel.streamNavItems).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "/other/index.html", label: "Other", isCurrent: false }),
      ]),
    );
  });

  it("reuses a precomputed feed-section context without changing the model output", () => {
    const context = buildFeedSectionContext(normalizedPayload);

    expect(listFeedSections(normalizedPayload, { context })).toEqual(
      listFeedSections(normalizedPayload),
    );
    expect(
      buildFeedSectionModel(normalizedPayload, { sectionId: "feed", context }),
    ).toEqual(
      buildFeedSectionModel(normalizedPayload, { sectionId: "feed" }),
    );
  });
});
