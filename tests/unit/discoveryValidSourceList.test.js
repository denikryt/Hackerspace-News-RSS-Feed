import { describe, expect, it } from "vitest";

import { buildDiscoveryValidSourceRowsPayload, mergeValidSourceEntries } from "../../src/discoveryValidSourceList.js";

describe("buildDiscoveryValidSourceRowsPayload", () => {
  it("builds a clean valid-only source list with public registry field names", () => {
    const payload = buildDiscoveryValidSourceRowsPayload({
      discoveryPayload: {
        generatedAt: "2026-03-30T12:00:00.000Z",
        sourcePageUrl: "https://wiki.hackerspaces.org/List_of_Hacker_Spaces",
        groupedByValidationStatus: {
          valid: [
            {
              hackerspaceName: "Alpha",
              hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Alpha",
              country: "Wonderland",
              feedUrl: "https://alpha.example/feed.xml",
              siteUrl: "https://alpha.example/",
              status: "confirmed",
              validationStatus: "valid",
              sourceType: "ignore-me",
              discoveryMethod: "alternate_link",
            },
          ],
          invalid: [
            {
              hackerspaceName: "Beta",
              hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Beta",
              country: "Nowhere",
              validationStatus: "invalid",
            },
          ],
        },
      },
    });

    expect(payload).toEqual({
      items: [
        {
          hackerspaceName: "Alpha",
          hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Alpha",
          country: "Wonderland",
          website: "https://alpha.example/",
          feedUrl: "https://alpha.example/feed.xml",
        },
      ],
    });
  });
});

describe("mergeValidSourceEntries", () => {
  const alpha = {
    hackerspaceName: "Alpha",
    website: "https://alpha.example/",
    feedUrl: "https://alpha.example/feed.xml",
  };
  const alphaUpdated = {
    hackerspaceName: "Alpha Updated",
    website: "https://alpha.example/",
    feedUrl: "https://alpha.example/new-feed.xml",
  };
  const beta = {
    hackerspaceName: "Beta",
    website: "https://beta.example/",
    feedUrl: "https://beta.example/rss.xml",
  };

  it("appends new entries not present in existing list", () => {
    expect(mergeValidSourceEntries([alpha], [beta])).toEqual([alpha, beta]);
  });

  it("preserves existing entry when incoming has the same website", () => {
    expect(mergeValidSourceEntries([alpha], [alphaUpdated])).toEqual([alpha]);
  });

  it("handles empty existing list — returns incoming as-is", () => {
    expect(mergeValidSourceEntries([], [alpha, beta])).toEqual([alpha, beta]);
  });

  it("handles empty incoming list — returns existing as-is", () => {
    expect(mergeValidSourceEntries([alpha], [])).toEqual([alpha]);
  });

  it("handles both lists empty", () => {
    expect(mergeValidSourceEntries([], [])).toEqual([]);
  });
});

describe("manual registry deduplication", () => {
  const a = { hackerspaceName: "Alpha", country: "France", website: "https://alpha.example", feedUrl: "https://alpha.example/feed" };
  const b = { hackerspaceName: "Beta", country: "France", website: "https://beta.example", feedUrl: "https://beta.example/feed" };
  it("preserves a manual feed if discovery uses a different website URL", () => {
    expect(mergeValidSourceEntries([a], [{ ...a, website: "https://www.alpha.example" }])).toEqual([a]);
  });
  it("deduplicates entries in the incoming list", () => {
    expect(mergeValidSourceEntries([a], [b, b])).toEqual([a, b]);
  });
});
