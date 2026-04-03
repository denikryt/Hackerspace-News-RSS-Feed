import { describe, expect, it } from "vitest";

import { enrichFeedItem } from "../../src/feedEnricher.js";

describe("enrichFeedItem", () => {
  it("returns a stable minimal contract for items with only title and link", () => {
    const enriched = enrichFeedItem({
      id: "minimal-1",
      title: "Only title",
      link: "https://example.com/post",
    });

    expect(enriched).toEqual({
      id: "minimal-1",
      title: "Only title",
      link: "https://example.com/post",
      observed: {},
      wordCount: 0,
      hasFullContent: false,
      hasSummary: false,
      hasCategories: false,
      hasAuthor: false,
    });
  });

  it("resolves publication fields from explicit candidates and keeps source metadata", () => {
    const enriched = enrichFeedItem({
      id: "rich-1",
      title: "Rich item",
      link: "https://example.com/rich",
      categoriesRaw: [" Event ", "Unknown", "Nieuws", "Projekte"],
      authorCandidates: [
        { field: "author", value: "Alice Author" },
        { field: "creator", value: "Bob Creator" },
      ],
      dateCandidates: [
        { field: "updated", value: "2025-01-03T10:00:00.000Z" },
        { field: "pubDate", value: "2025-01-01T10:00:00.000Z" },
        { field: "published", value: "2025-01-02T12:00:00.000Z" },
      ],
      summaryCandidates: [
        { field: "contentSnippet", text: "Short summary words" },
      ],
      contentCandidates: [
        {
          field: "content:encoded",
          html: "<p>Full content words here</p>",
          text: "Full content words here",
        },
      ],
    });

    expect(enriched).toMatchObject({
      id: "rich-1",
      title: "Rich item",
      link: "https://example.com/rich",
      resolvedAuthor: "Alice Author",
      authorSource: "author",
      publishedAt: "2025-01-01T10:00:00.000Z",
      updatedAt: "2025-01-03T10:00:00.000Z",
      displayDate: "2025-01-01T10:00:00.000Z",
      dateSource: "pubDate",
      displayContent: {
        text: "<p>Full content words here</p>",
        wasTruncated: false,
        format: "html",
        sourceField: "content:encoded",
      },
      wordCount: 3,
      hasFullContent: true,
      hasSummary: true,
      hasCategories: true,
      hasAuthor: true,
      normalizedCategories: ["events", "news", "projects"],
      unmappedCategories: ["Unknown"],
      observed: {
        categoriesRaw: [" Event ", "Unknown", "Nieuws", "Projekte"],
        authorCandidates: [
          { field: "author", value: "Alice Author" },
          { field: "creator", value: "Bob Creator" },
        ],
        dateCandidates: [
          { field: "updated", value: "2025-01-03T10:00:00.000Z" },
          { field: "pubDate", value: "2025-01-01T10:00:00.000Z" },
          { field: "published", value: "2025-01-02T12:00:00.000Z" },
        ],
        summaryCandidates: [
          { field: "contentSnippet", text: "Short summary words" },
        ],
      },
    });
    expect(enriched.observed.contentCandidates).toBeUndefined();
    expect(enriched.summaryText).toBeUndefined();
    expect(enriched.summaryHtml).toBeUndefined();
    expect(enriched.summarySource).toBeUndefined();
    expect(enriched.contentText).toBeUndefined();
    expect(enriched.contentHtml).toBeUndefined();
    expect(enriched.contentSource).toBeUndefined();
  });

  it("uses summary as the primary text when full content is missing", () => {
    const enriched = enrichFeedItem({
      id: "summary-only",
      title: "Summary only",
      summaryCandidates: [
        {
          field: "summary",
          html: "<p>Summary only text</p>",
          text: "Summary only text",
        },
      ],
    });

    expect(enriched).toMatchObject({
      displayContent: {
        text: "<p>Summary only text</p>",
        wasTruncated: false,
        format: "html",
        sourceField: "summary",
      },
      wordCount: 3,
      hasFullContent: false,
      hasSummary: true,
      observed: {
        summaryCandidates: [
          {
            field: "summary",
            html: "<p>Summary only text</p>",
            text: "Summary only text",
          },
        ],
      },
    });
    expect(enriched.summaryText).toBeUndefined();
    expect(enriched.summaryHtml).toBeUndefined();
    expect(enriched.summarySource).toBeUndefined();
  });

  it("stores only trimmed display content when full content exists without summary", () => {
    const enriched = enrichFeedItem({
      id: "content-only",
      title: "Content only",
      contentCandidates: [
        {
          field: "content:encoded",
          text: "x".repeat(700),
          html: `<p>${"x".repeat(700)}</p>`,
        },
      ],
    });

    expect(enriched.displayContent).toMatchObject({
      wasTruncated: true,
      format: "html",
      sourceField: "content:encoded",
    });
    expect(enriched.displayContent.text.endsWith("…</p>")).toBe(true);
    expect(enriched.observed.contentCandidates).toBeUndefined();
  });

  it("stores trimmed display content when summary exceeds the max length", () => {
    const enriched = enrichFeedItem({
      id: "summary-long",
      title: "Summary long",
      summaryCandidates: [
        {
          field: "summary",
          text: "x".repeat(700),
        },
      ],
    });

    expect(enriched.displayContent).toMatchObject({
      wasTruncated: true,
      format: "text",
      sourceField: "summary",
    });
    expect(enriched.displayContent.text).toHaveLength(501);
    expect(enriched.displayContent.text.endsWith("…")).toBe(true);
  });
});
