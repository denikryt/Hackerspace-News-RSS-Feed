import { describe, expect, it } from "vitest";

import {
  parseCuratedPublicationsYaml,
  resolveCuratedPublications,
} from "../../src/curated.js";

describe("curated yaml contract", () => {
  it("parses feedUrl and guid entries from yaml", () => {
    const entries = parseCuratedPublicationsYaml(`
- feedUrl: https://blog.nachitima.com/feed/
  guid: https://blog.nachitima.com/interview-with-sasha-hackerspace-stories
`);

    expect(entries).toEqual([
      {
        feedUrl: "https://blog.nachitima.com/feed/",
        guid: "https://blog.nachitima.com/interview-with-sasha-hackerspace-stories",
      },
    ]);
  });

  it("rejects yaml entries without guid", () => {
    expect(() =>
      parseCuratedPublicationsYaml(`
- feedUrl: https://blog.nachitima.com/feed/
`),
    ).toThrow("guid");
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
