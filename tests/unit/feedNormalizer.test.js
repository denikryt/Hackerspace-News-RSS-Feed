import { describe, expect, it } from "vitest";

import { normalizeFeed } from "../../src/feedNormalizer.js";

describe("normalizeFeed", () => {
  it("normalizes feed metadata and preserves observed candidates without winner selection", () => {
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
          author: "Ignored author",
          pubDate: "Wed, 01 Jan 2025 10:00:00 GMT",
          isoDate: "2025-01-01T10:00:00.000Z",
          updated: "2025-01-02T10:00:00.000Z",
          creator: "Alice",
          categories: ["News", "Updates"],
          summary: "<p>Summary html</p>",
          content: "<p>Hello</p>",
          contentSnippet: "Hello",
          description: "Description fallback",
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
      guid: "post-1",
      categoriesRaw: ["News", "Updates"],
      authorCandidates: [
        { field: "author", value: "Ignored author" },
        { field: "creator", value: "Alice" },
      ],
      dateCandidates: [
        { field: "isoDate", value: "2025-01-01T10:00:00.000Z" },
        { field: "pubDate", value: "2025-01-01T10:00:00.000Z" },
        { field: "updated", value: "2025-01-02T10:00:00.000Z" },
      ],
      summaryCandidates: [
        {
          field: "contentSnippet",
          text: "Hello",
        },
        {
          field: "summary",
          html: "<p>Summary html</p>",
          text: "Summary html",
        },
        {
          field: "description",
          text: "Description fallback",
        },
      ],
      contentCandidates: [
        {
          field: "content",
          html: "<p>Hello</p>",
          text: "Hello",
        },
      ],
    });
    expect(normalized.items[0].publishedAt).toBeUndefined();
    expect(normalized.items[0].resolvedAuthor).toBeUndefined();
    expect(normalized.items[0].displayDate).toBeUndefined();
    expect(normalized.items[1]).toMatchObject({
      title: "Post two",
      link: "https://www.betamachine.fr/post-2",
    });
    expect(normalized.items[1].authorCandidates).toBeUndefined();
    expect(normalized.items[1].dateCandidates).toBeUndefined();
  });

  it("keeps html summaries and normalizes enclosure attachments", () => {
    const normalized = normalizeFeed({
      sourceRow: {
        rowNumber: 3,
        hackerspaceName: "C3D2",
        hackerspaceWikiUrl: "https://wiki.hackerspaces.org/C3D2",
        candidateFeedUrl: "https://c3d2.de/news-atom.xml",
        country: "Germany",
      },
      validation: {
        candidateUrl: "https://c3d2.de/news-atom.xml",
        finalUrl: "https://c3d2.de/news-atom.xml",
        detectedFormat: "atom",
      },
      parsedFeed: {
        title: "C3D2 Feed",
        items: [
          {
            title: "Linked post",
            summary: '<p>Read <a href="https://example.com/more">more</a></p>',
            enclosure: {
              url: "https://example.com/audio.mp3",
              type: "audio/mpeg",
            },
          },
        ],
      },
    });

    expect(normalized.items[0]).toMatchObject({
      title: "Linked post",
      summaryCandidates: [
        {
          field: "summary",
          html: '<p>Read <a href="https://example.com/more">more</a></p>',
          text: "Read more",
        },
      ],
      attachments: [
        {
          url: "https://example.com/audio.mp3",
          type: "audio/mpeg",
        },
      ],
    });
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

  it("drops non-scalar item titles instead of keeping raw parser objects", () => {
    const normalized = normalizeFeed({
      sourceRow: {
        rowNumber: 7,
        hackerspaceName: "MAKER's EDGe",
        hackerspaceWikiUrl: "https://wiki.hackerspaces.org/MAKER%27s_EDGe",
        candidateFeedUrl: "http://makersedge.blogspot.com/feeds/posts/default?alt=rss",
        country: "US",
      },
      validation: {
        candidateUrl: "http://makersedge.blogspot.com/feeds/posts/default?alt=rss",
        finalUrl: "http://makersedge.blogspot.com/feeds/posts/default?alt=rss",
        detectedFormat: "rss",
      },
      parsedFeed: {
        title: "MAKER's EDGe Feed",
        items: [
          {
            title: { $: { type: "text" } },
            link: "http://makersedge.blogspot.com/2013/12/example.html",
          },
        ],
      },
    });

    expect(normalized.items[0].title).toBeUndefined();
    expect(normalized.items[0].link).toBe("http://makersedge.blogspot.com/2013/12/example.html");
  });
});
