import { describe, expect, it } from "vitest";

import {
  parseCuratedPublications,
  resolveCuratedPublications,
} from "../../src/curated.js";

describe("curated JSON contract", () => {
  it("reads exact feedUrl and guid strings from items", () => {
    const entry = { feedUrl: "https://blog.nachitima.com/feed/", guid: "https://blog.nachitima.com/interview-with-sasha-hackerspace-stories" };
    expect(parseCuratedPublications(JSON.stringify({ items: [entry] }))).toEqual([entry]);
  });
  it("accepts an explicitly empty registry", () => {
    expect(parseCuratedPublications('{"items":[]}')).toEqual([]);
  });
  it.each([null, [], {}, { items: {} }, { items: [null] }, { items: [{ feedUrl: "https://example.org/feed" }] }, { items: [{ feedUrl: "", guid: "id" }] }, { items: [{ feedUrl: 123, guid: "id" }] }])("rejects invalid registry shapes: %j", payload => {
    expect(() => parseCuratedPublications(JSON.stringify(payload))).toThrow(/curated/i);
  });
  it("rejects malformed JSON", () => {
    expect(() => parseCuratedPublications("{broken")).toThrow();
  });
});

describe("resolveCuratedPublications", () => {
  it("matches publications by exact feedUrl and guid", () => {
    const result = resolveCuratedPublications(
      [
        {
          feedUrl: "https://blog.nachitima.com/feed/",
          guid: "https://blog.nachitima.com/interview-with-sasha-hackerspace-stories",
        },
      ],
      [
        {
          finalFeedUrl: "https://blog.nachitima.com/feed/",
          siteUrl: "https://blog.nachitima.com",
          feedTitle: "Nachitima Blog",
          items: [
            {
              guid: "https://blog.nachitima.com/interview-with-sasha-hackerspace-stories",
              title: "Interview with Sasha",
              resolvedAuthor: "Nachitima",
            },
          ],
        },
      ],
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      guid: "https://blog.nachitima.com/interview-with-sasha-hackerspace-stories",
      title: "Interview with Sasha",
      feedUrl: "https://blog.nachitima.com/feed/",
      siteUrl: "https://blog.nachitima.com",
    });
    expect(result.unresolved).toEqual([]);
  });

  it("keeps unresolved entries when no exact match exists", () => {
    const result = resolveCuratedPublications(
      [
        {
          feedUrl: "https://blog.nachitima.com/feed/",
          guid: "https://blog.nachitima.com/interview-with-sasha-hackerspace-stories",
        },
      ],
      [
        {
          finalFeedUrl: "https://blog.nachitima.com/feed/",
          items: [
            {
              guid: "https://blog.nachitima.com/another-post",
              title: "Another post",
            },
          ],
        },
      ],
    );

    expect(result.items).toEqual([]);
    expect(result.unresolved).toEqual([
      {
        feedUrl: "https://blog.nachitima.com/feed/",
        guid: "https://blog.nachitima.com/interview-with-sasha-hackerspace-stories",
      },
    ]);
  });
});
