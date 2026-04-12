import { describe, expect, it } from "vitest";

import {
  validateNormalizedRenderPayload,
  validateNormalizedRenderPayloadForDisplay,
} from "../../src/renderInputValidation.js";

describe("renderInputValidation", () => {
  it("accepts the render-relevant normalized payload shape used by renderSite and visibleData", () => {
    const payload = validateNormalizedRenderPayload({
      generatedAt: "2026-03-19T20:00:00.000Z",
      sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
      summary: {
        sourceRows: 1,
        validFeeds: 1,
        parsedFeeds: 1,
        emptyFeeds: 0,
        failedFeeds: 0,
      },
      feeds: [
        {
          id: "row-2-betamachine",
          rowNumber: 2,
          sourceWikiUrl: "https://wiki.hackerspaces.org/BetaMachine",
          finalFeedUrl: "https://www.betamachine.fr/feed/",
          siteUrl: "https://www.betamachine.fr",
          spaceName: "BetaMachine",
          country: "France",
          feedType: "rss",
          status: "parsed_ok",
          items: [
            {
              id: "b-1",
              title: "Newest post",
              link: "https://www.betamachine.fr/newest",
              resolvedAuthor: "Alice",
              authorSource: "author",
              publishedAt: "2025-01-02T10:00:00.000Z",
              displayDate: "2025-01-02T10:00:00.000Z",
              summary: "Newest summary",
              summaryHtml: "<p>Newest summary</p>",
              normalizedCategories: ["events"],
            },
          ],
        },
      ],
      failures: [
        {
          hackerspaceName: "Akiba",
          sourceWikiUrl: "https://wiki.hackerspaces.org/Akiba",
          country: "Japan",
          candidateUrl: "https://example.com/feed.xml",
          errorCode: "fetch_failed",
        },
      ],
    });

    expect(payload.summary.parsedFeeds).toBe(1);
    expect(payload.feeds[0].items[0].normalizedCategories).toEqual(["events"]);
  });

  it("rejects invalid render-relevant payloads with a clear schema error", () => {
    expect(() =>
      validateNormalizedRenderPayload({
        generatedAt: "2026-03-19T20:00:00.000Z",
        sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
        summary: {
          sourceRows: 1,
          validFeeds: 1,
          parsedFeeds: "not-a-number",
          emptyFeeds: 0,
          failedFeeds: 0,
        },
        feeds: [],
        failures: [],
      }),
    ).toThrow(/parsedFeeds/i);
  });

  it("preserves the fields required by visibleData filtering after validation", () => {
    const payload = validateNormalizedRenderPayloadForDisplay({
      generatedAt: "2026-03-19T20:00:00.000Z",
      sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
      summary: {
        sourceRows: 1,
        validFeeds: 1,
        parsedFeeds: 1,
        emptyFeeds: 0,
        failedFeeds: 0,
      },
      feeds: [
        {
          id: "row-2-betamachine",
          rowNumber: 2,
          sourceWikiUrl: "https://wiki.hackerspaces.org/BetaMachine",
          finalFeedUrl: "https://www.betamachine.fr/feed/",
          siteUrl: "https://www.betamachine.fr",
          spaceName: "BetaMachine",
          country: "France",
          feedType: "rss",
          status: "parsed_ok",
          items: [
            {
              id: "future-item",
              title: "Future post",
              displayDate: "2034-07-28T18:00:00.000Z",
            },
          ],
        },
      ],
      failures: [],
    });

    expect(payload.feeds[0].items[0].displayDate).toBe("2034-07-28T18:00:00.000Z");
  });
});
