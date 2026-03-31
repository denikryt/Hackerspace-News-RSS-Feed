import { describe, expect, it } from "vitest";

import { analyzeWikiDiscoveryComparison } from "../src/wikiDiscoveryComparison.js";

describe("analyzeWikiDiscoveryComparison", () => {
  it("separates matched wiki feed urls from unmatched ones and explains why they are missing", async () => {
    const result = await analyzeWikiDiscoveryComparison({
      wikiSourceRowsPayload: {
        sourcePageUrl: "https://wiki.example/source-list",
        urls: [
          {
            hackerspaceName: "Alpha",
            candidateFeedUrl: "https://alpha.example/feed.xml",
          },
          {
            hackerspaceName: "Beta",
            candidateFeedUrl: "https://beta.example/feed.xml",
          },
          {
            hackerspaceName: "Gamma",
            candidateFeedUrl: "https://gamma.example/feed.xml",
          },
          {
            hackerspaceName: "Delta",
            candidateFeedUrl: "https://delta.example/feed.xml",
          },
        ],
      },
      discoveryPayload: {
        sourcePageUrl: "https://wiki.example/discovery",
        groupedByValidationStatus: {
          valid: [
            {
              hackerspaceName: "Alpha",
              siteUrl: "https://alpha.example/",
              feedUrl: "https://alpha.example/feed.xml",
              discoveryMethod: "alternate_link",
              validationStatus: "valid",
            },
            {
              hackerspaceName: "Beta",
              siteUrl: "https://beta.example/",
              feedUrl: "https://feeds.beta.example/news.xml",
              discoveryMethod: "fallback_path",
              validationStatus: "valid",
            },
          ],
          empty: [],
          invalid: [
            {
              hackerspaceName: "Gamma",
              siteUrl: "https://gamma.example/",
              validationStatus: "invalid",
            },
          ],
          unreachable: [],
          not_checked: [],
        },
      },
    });

    expect(result.summary).toMatchObject({
      wikiUrls: 4,
      matched: 1,
      unmatched: 1,
      noDiscoveredXmlFeed: 1,
      noDiscoveryEntry: 1,
      exactValidMatches: 1,
      sameHackerspaceDifferentXmlUrl: 1,
      noDiscoveryXmlFeedForHackerspace: 1,
      noDiscoveryEntryForHackerspace: 1,
    });

    expect(result.matched).toEqual([
      expect.objectContaining({
        hackerspaceName: "Alpha",
        wikiFeedUrl: "https://alpha.example/feed.xml",
        discoveryFeedUrl: "https://alpha.example/feed.xml",
        discoveryMethod: "alternate_link",
        matchType: "exact_valid_match",
      }),
    ]);

    expect(result.unmatched).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          hackerspaceName: "Beta",
          wikiFeedUrl: "https://beta.example/feed.xml",
          reason: "different_discovered_xml_feed",
          discoveryFeedUrl: "https://feeds.beta.example/news.xml",
          discoveryMethod: "fallback_path",
        }),
      ]),
    );

    expect(result.noDiscoveredXmlFeed).toEqual([
      expect.objectContaining({
        hackerspaceName: "Gamma",
        wikiFeedUrl: "https://gamma.example/feed.xml",
        reason: "no_discovered_xml_feed",
        discoveryValidationStatuses: ["invalid"],
      }),
    ]);

    expect(result.noDiscoveryEntry).toEqual([
      expect.objectContaining({
        hackerspaceName: "Delta",
        wikiFeedUrl: "https://delta.example/feed.xml",
        reason: "no_discovery_entry",
      }),
    ]);
  });
});
