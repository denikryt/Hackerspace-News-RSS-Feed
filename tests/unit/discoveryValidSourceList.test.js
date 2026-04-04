import { describe, expect, it } from "vitest";

import { buildDiscoveryValidSourceRowsPayload } from "../../src/discoveryValidSourceList.js";

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
          candidateFeedUrl: "https://alpha.example/feed.xml",
          sourceType: "discovery",
        },
      ],
    });
  });
});
