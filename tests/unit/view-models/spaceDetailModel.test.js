import { describe, expect, it } from "vitest";

import { buildAuthorDirectory } from "../../../src/viewModels/authors.js";
import { buildSpaceDetailModel } from "../../../src/viewModels/spaceDetail.js";

const normalizedPayload = {
  generatedAt: "2026-03-22T20:00:00.000Z",
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
      id: "feed-1",
      sourceWikiUrl: "https://wiki.hackerspaces.org/BetaMachine",
      finalFeedUrl: "https://www.betamachine.fr/feed/",
      siteUrl: "https://www.betamachine.fr",
      spaceName: "BetaMachine",
      country: "France",
      feedType: "rss",
      status: "parsed_ok",
      items: [
        {
          id: "a-1",
          title: "Newest Alice",
          link: "https://example.com/alice-newest",
          resolvedAuthor: "Alice",
          authorSource: "author",
          displayDate: "2025-01-03T10:00:00.000Z",
        },
        {
          id: "a-2",
          title: "Older Alice",
          link: "https://example.com/alice-older",
          resolvedAuthor: "Alice",
          authorSource: "creator",
          displayDate: "2025-01-01T10:00:00.000Z",
        },
      ],
    },
  ],
  failures: [],
};

describe("buildSpaceDetailModel", () => {
  it("reuses a precomputed author directory without changing the space model", () => {
    const authorDirectory = buildAuthorDirectory(normalizedPayload);

    expect(
      buildSpaceDetailModel(normalizedPayload, "betamachine", { authorDirectory }),
    ).toEqual(
      buildSpaceDetailModel(normalizedPayload, "betamachine"),
    );
  });
});
