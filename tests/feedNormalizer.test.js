import { describe, expect, it } from "vitest";

import { normalizeFeed } from "../src/feedNormalizer.js";

describe("normalizeFeed", () => {
  it("normalizes feed metadata and keeps only available fields", () => {
    const sourceRow = {
      rowNumber: 2,
      hackerspaceName: "BetaMachine",
      hackerspaceWikiUrl: "https://wiki.hackerspaces.org/BetaMachine",
      candidateFeedUrl: "https://www.betamachine.fr/feed/",
      country: "France",
    };

    const parsedFeed = {
      title: "BetaMachine Feed",
      description: "Latest posts",
      link: "https://www.betamachine.fr",
      language: "en",
      items: [
        {
          title: "Post one",
          link: "https://www.betamachine.fr/post-1",
          pubDate: "Wed, 01 Jan 2025 10:00:00 GMT",
          creator: "Alice",
          categories: ["News", "Updates"],
          content: "<p>Hello</p>",
          contentSnippet: "Hello",
          guid: "post-1",
        },
        {
          title: "Post two",
          link: "https://www.betamachine.fr/post-2",
        },
      ],
    };

    const normalized = normalizeFeed({
      sourceRow,
      validation: {
        candidateUrl: sourceRow.candidateFeedUrl,
        finalUrl: sourceRow.candidateFeedUrl,
        detectedFormat: "rss",
      },
      parsedFeed,
    });

    expect(normalized).toMatchObject({
      rowNumber: 2,
      sourceWikiUrl: "https://wiki.hackerspaces.org/BetaMachine",
      spaceName: "BetaMachine",
      country: "France",
      feedTitle: "BetaMachine Feed",
      feedType: "rss",
      status: "parsed_ok",
    });

    expect(normalized.items).toHaveLength(2);
    expect(normalized.items[0]).toMatchObject({
      title: "Post one",
      author: "Alice",
      categories: ["News", "Updates"],
      contentHtml: "<p>Hello</p>",
      contentText: "Hello",
    });
    expect(normalized.items[0].publishedAt).toBe("2025-01-01T10:00:00.000Z");
    expect(normalized.items[1].author).toBeUndefined();
    expect(normalized.items[1].publishedAt).toBeUndefined();
  });

  it("marks feeds with no items as parsed_empty", () => {
    const normalized = normalizeFeed({
      sourceRow: {
        rowNumber: 1,
        hackerspaceName: "Akiba",
        hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Akiba",
        candidateFeedUrl: "https://example.com/feed.xml",
        country: "Russian Federation",
      },
      validation: {
        candidateUrl: "https://example.com/feed.xml",
        finalUrl: "https://example.com/feed.xml",
        detectedFormat: "atom",
      },
      parsedFeed: {
        title: "Akiba feed",
        items: [],
      },
    });

    expect(normalized.status).toBe("parsed_empty");
    expect(normalized.items).toEqual([]);
  });
});
