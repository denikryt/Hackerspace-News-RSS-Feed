import { describe, expect, it } from "vitest";

import {
  buildAuthorDetailModel,
  buildAuthorsIndexModel,
} from "../src/viewModels/authors.js";

const normalizedPayload = {
  generatedAt: "2026-03-22T20:00:00.000Z",
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
      id: "feed-1",
      sourceWikiUrl: "https://wiki.hackerspaces.org/BetaMachine",
      finalFeedUrl: "https://www.betamachine.fr/feed/",
      siteUrl: "https://www.betamachine.fr",
      spaceName: "BetaMachine",
      country: "France",
      status: "parsed_ok",
      items: [
        {
          id: "a-1",
          title: "Newest Alice",
          link: "https://example.com/alice-newest",
          resolvedAuthor: "Alice",
          authorSource: "author",
          displayDate: "2025-01-03T10:00:00.000Z",
        },
        {
          id: "a-2",
          title: "Older Alice",
          link: "https://example.com/alice-older",
          resolvedAuthor: "Alice",
          authorSource: "creator",
          displayDate: "2025-01-01T10:00:00.000Z",
        },
        {
          id: "admin-1",
          title: "Admin post",
          resolvedAuthor: "admin",
          authorSource: "creator",
          displayDate: "2025-01-02T10:00:00.000Z",
        },
      ],
    },
    {
      id: "feed-2",
      sourceWikiUrl: "https://wiki.hackerspaces.org/C3D2",
      finalFeedUrl: "https://c3d2.de/news-atom.xml",
      siteUrl: "https://c3d2.de",
      spaceName: "C3D2",
      country: "Germany",
      status: "parsed_ok",
      items: [
        {
          id: "j-1",
          title: "John one",
          resolvedAuthor: "John Doe",
          authorSource: "author",
          displayDate: "2025-01-04T10:00:00.000Z",
        },
        {
          id: "j-2",
          title: "John two",
          resolvedAuthor: "John-Doe",
          authorSource: "author",
          displayDate: "2025-01-05T10:00:00.000Z",
        },
      ],
    },
  ],
  failures: [],
};

describe("author view models", () => {
  it("builds an authors index and excludes names from the exclusion list", () => {
    const model = buildAuthorsIndexModel(normalizedPayload, {
      excludedAuthorNames: ["admin", "root", "unknown"],
    });

    expect(model.authors.map((author) => author.displayName)).toEqual(["Alice", "John Doe", "John-Doe"]);
    expect(model.authors.map((author) => author.slug)).toEqual(["alice", "john-doe", "john-doe-2"]);
    expect(model.authors.find((author) => author.displayName === "Alice")).toMatchObject({
      itemCount: 2,
      detailHref: "/authors/alice.html",
    });
  });

  it("builds a paginated author detail model sorted newest first", () => {
    const payload = {
      ...normalizedPayload,
      feeds: [
        {
          ...normalizedPayload.feeds[0],
          items: Array.from({ length: 12 }, (_, index) => ({
            id: `alice-${index + 1}`,
            title: `Alice ${index + 1}`,
            resolvedAuthor: "Alice",
            authorSource: "author",
            displayDate: `2025-01-${String(12 - index).padStart(2, "0")}T10:00:00.000Z`,
          })),
        },
      ],
    };

    const model = buildAuthorDetailModel(payload, "alice", {
      currentPage: 2,
      excludedAuthorNames: ["admin", "root", "unknown"],
    });

    expect(model.authorDisplayName).toBe("Alice");
    expect(model.currentPage).toBe(2);
    expect(model.totalPages).toBe(2);
    expect(model.items).toHaveLength(2);
    expect(model.items.map((item) => item.title)).toEqual(["Alice 11", "Alice 12"]);
    expect(model.previousPageHref).toBe("/authors/alice.html");
    expect(model.pageLinks).toEqual([
      { type: "page", page: 1, href: "/authors/alice.html", isCurrent: false },
      { type: "page", page: 2, href: "/authors/alice/page/2/", isCurrent: true },
    ]);
    expect(model.publicationCountLabel).toBe("2 of 12 publications");
  });
});
