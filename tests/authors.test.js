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
        {
          id: "at-1",
          title: "Alice handle",
          link: "https://example.com/alice-handle",
          resolvedAuthor: "@Alice",
          authorSource: "author",
          displayDate: "2025-01-02T12:00:00.000Z",
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
  it("builds an authors index with default filter and sort contract", () => {
    const model = buildAuthorsIndexModel(normalizedPayload, {
      excludedAuthorNames: ["admin", "root", "unknown"],
    });

    expect(model.selectedHackerspace).toBe("all");
    expect(model.sortMode).toBe("alphabetical");
    expect(model.availableHackerspaces).toEqual(["BetaMachine", "C3D2"]);
    expect(model.authors.map((author) => author.displayName)).toEqual(["Alice", "John Doe", "John-Doe"]);
    expect(model.visibleAuthors.map((author) => author.displayName)).toEqual([
      "Alice",
      "John Doe",
      "John-Doe",
    ]);
    expect(model.authors.map((author) => author.slug)).toEqual(["alice", "john-doe", "john-doe-2"]);
    expect(model.authors.find((author) => author.displayName === "Alice")).toMatchObject({
      itemCount: 3,
      detailHref: "/authors/alice.html",
      hackerspaces: [{ name: "BetaMachine", href: "/spaces/betamachine.html" }],
    });
  });

  it("filters authors by selected hackerspace", () => {
    const model = buildAuthorsIndexModel(normalizedPayload, {
      selectedHackerspace: "C3D2",
      excludedAuthorNames: ["admin", "root", "unknown"],
    });

    expect(model.selectedHackerspace).toBe("C3D2");
    expect(model.visibleAuthors.map((author) => author.displayName)).toEqual([
      "John Doe",
      "John-Doe",
    ]);
  });

  it("sorts authors by publication count descending with deterministic tie-breaks", () => {
    const model = buildAuthorsIndexModel(
      {
        ...normalizedPayload,
        feeds: [
          normalizedPayload.feeds[0],
          {
            ...normalizedPayload.feeds[1],
            items: [
              {
                id: "b-1",
                title: "Bob one",
                resolvedAuthor: "Bob",
                authorSource: "author",
                displayDate: "2025-01-05T10:00:00.000Z",
              },
              {
                id: "b-2",
                title: "Bob two",
                resolvedAuthor: "Bob",
                authorSource: "author",
                displayDate: "2025-01-04T10:00:00.000Z",
              },
              {
                id: "charlie-1",
                title: "Charlie one",
                resolvedAuthor: "Charlie",
                authorSource: "author",
                displayDate: "2025-01-04T10:00:00.000Z",
              },
              {
                id: "charlie-2",
                title: "Charlie two",
                resolvedAuthor: "Charlie",
                authorSource: "author",
                displayDate: "2025-01-03T10:00:00.000Z",
              },
            ],
          },
        ],
      },
      {
        sortMode: "publication-count",
        excludedAuthorNames: ["admin", "root", "unknown"],
      },
    );

    expect(model.sortMode).toBe("publication-count");
    expect(model.visibleAuthors.map((author) => author.displayName)).toEqual([
      "Alice",
      "Bob",
      "Charlie",
    ]);
  });

  it("sorts authors by latest publication descending and places undated authors last", () => {
    const model = buildAuthorsIndexModel(
      {
        ...normalizedPayload,
        feeds: [
          normalizedPayload.feeds[0],
          {
            ...normalizedPayload.feeds[1],
            items: [
              {
                id: "b-1",
                title: "Bob one",
                resolvedAuthor: "Bob",
                authorSource: "author",
                displayDate: "2025-01-06T10:00:00.000Z",
              },
              {
                id: "charlie-1",
                title: "Charlie one",
                resolvedAuthor: "Charlie",
                authorSource: "author",
                displayDate: "2025-01-06T10:00:00.000Z",
              },
              {
                id: "nodate-1",
                title: "No date item",
                resolvedAuthor: "No Date",
                authorSource: "author",
              },
            ],
          },
        ],
      },
      {
        sortMode: "latest-publication",
        excludedAuthorNames: ["admin", "root", "unknown"],
      },
    );

    expect(model.sortMode).toBe("latest-publication");
    expect(model.visibleAuthors.map((author) => author.displayName)).toEqual([
      "Bob",
      "Charlie",
      "Alice",
      "No Date",
    ]);
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

  it("normalizes leading at-signs for author grouping, display, and exclusion matching", () => {
    const model = buildAuthorsIndexModel(
      {
        ...normalizedPayload,
        feeds: [
          {
            ...normalizedPayload.feeds[0],
            items: [
              {
                id: "a-1",
                title: "Handle author",
                resolvedAuthor: "@agumon0241",
                authorSource: "author",
                displayDate: "2025-01-03T10:00:00.000Z",
              },
              {
                id: "a-2",
                title: "Plain author",
                resolvedAuthor: "agumon0241",
                authorSource: "creator",
                displayDate: "2025-01-02T10:00:00.000Z",
              },
              {
                id: "r-1",
                title: "Root handle",
                resolvedAuthor: "@root",
                authorSource: "author",
                displayDate: "2025-01-01T10:00:00.000Z",
              },
            ],
          },
        ],
      },
      {
        excludedAuthorNames: ["root"],
      },
    );

    expect(model.authors).toEqual([
      expect.objectContaining({
        displayName: "agumon0241",
        slug: "agumon0241",
        itemCount: 2,
      }),
    ]);
  });

  it("builds author groups from canonical delimiter and explicit overrides", () => {
    const model = buildAuthorsIndexModel(
      {
        ...normalizedPayload,
        feeds: [
          {
            ...normalizedPayload.feeds[0],
            items: [
              {
                id: "ab-1",
                title: "Shared canonical item",
                resolvedAuthor: "Alice | Bob",
                authorSource: "author",
                displayDate: "2025-01-03T10:00:00.000Z",
              },
              {
                id: "legacy-1",
                title: "Legacy multi-author item",
                resolvedAuthor: "kuchenblechmafia, s3lph",
                authorSource: "author",
                displayDate: "2025-01-02T10:00:00.000Z",
              },
              {
                id: "single-1",
                title: "Legacy comma single author",
                resolvedAuthor: "Arnold, David",
                authorSource: "author",
                displayDate: "2025-01-01T10:00:00.000Z",
              },
            ],
          },
        ],
      },
      {
        excludedAuthorNames: ["admin"],
        authorOverrides: {
          "kuchenblechmafia, s3lph": ["kuchenblechmafia", "s3lph"],
        },
      },
    );

    expect(model.authors.map((author) => author.displayName)).toEqual([
      "Alice",
      "Arnold, David",
      "Bob",
      "kuchenblechmafia",
      "s3lph",
    ]);

    expect(model.authors.find((author) => author.displayName === "Alice")).toMatchObject({
      itemCount: 1,
    });
    expect(model.authors.find((author) => author.displayName === "Bob")).toMatchObject({
      itemCount: 1,
    });
    expect(model.authors.find((author) => author.displayName === "kuchenblechmafia")).toMatchObject({
      itemCount: 1,
    });
    expect(model.authors.find((author) => author.displayName === "s3lph")).toMatchObject({
      itemCount: 1,
    });
    expect(model.authors.find((author) => author.displayName === "Arnold, David")).toMatchObject({
      itemCount: 1,
    });
  });

  it("lists all hackerspaces where an author appears", () => {
    const model = buildAuthorsIndexModel(
      {
        ...normalizedPayload,
        feeds: [
          {
            ...normalizedPayload.feeds[0],
            items: [
              {
                id: "a-1",
                title: "Alice in BetaMachine",
                resolvedAuthor: "Alice",
                authorSource: "author",
                displayDate: "2025-01-03T10:00:00.000Z",
              },
            ],
          },
          {
            ...normalizedPayload.feeds[1],
            items: [
              {
                id: "a-2",
                title: "Alice in C3D2",
                resolvedAuthor: "Alice",
                authorSource: "author",
                displayDate: "2025-01-02T10:00:00.000Z",
              },
            ],
          },
        ],
      },
      {
        excludedAuthorNames: ["admin"],
      },
    );

    expect(model.authors).toEqual([
      expect.objectContaining({
        displayName: "Alice",
        hackerspaces: [
          { name: "BetaMachine", href: "/spaces/betamachine.html" },
          { name: "C3D2", href: "/spaces/c3d2.html" },
        ],
      }),
    ]);
  });
});
