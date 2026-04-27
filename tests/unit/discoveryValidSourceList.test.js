import { describe, expect, it } from "vitest";

import { buildDiscoveryValidSourceRowsPayload, mergeValidSourceEntries } from "../../src/discoveryValidSourceList.js";

describe("buildDiscoveryValidSourceRowsPayload", () => {
  it("builds a clean valid-only source list with wiki-compatible field names", () => {
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
      sourcePageUrl: "https://wiki.hackerspaces.org/List_of_Hacker_Spaces",
      extractedAt: "2026-03-30T12:00:00.000Z",
      urls: [
        {
          hackerspaceName: "Alpha",
          hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Alpha",
          country: "Wonderland",
          siteUrl: "https://alpha.example/",
          candidateFeedUrl: "https://alpha.example/feed.xml",
          sourceType: "discovery",
        },
      ],
    });
  });
});

describe("mergeValidSourceEntries", () => {
  const alpha = {
    hackerspaceName: "Alpha",
    siteUrl: "https://alpha.example/",
    candidateFeedUrl: "https://alpha.example/feed.xml",
    sourceType: "discovery",
  };
  const alphaUpdated = {
    hackerspaceName: "Alpha Updated",
    siteUrl: "https://alpha.example/",
    candidateFeedUrl: "https://alpha.example/new-feed.xml",
    sourceType: "discovery",
  };
  const beta = {
    hackerspaceName: "Beta",
    siteUrl: "https://beta.example/",
    candidateFeedUrl: "https://beta.example/rss.xml",
    sourceType: "discovery",
  };

  it("appends new entries not present in existing list", () => {
    expect(mergeValidSourceEntries([alpha], [beta])).toEqual([alpha, beta]);
  });

  it("preserves existing entry when incoming has the same siteUrl", () => {
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
