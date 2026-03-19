import { describe, expect, it } from "vitest";

import { renderHtmlPage } from "../src/renderHtmlPage.js";

describe("renderHtmlPage", () => {
  it("renders summary, feed metadata, and only available item fields", () => {
    const html = renderHtmlPage({
      sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
      generatedAt: "2026-03-19T19:00:00.000Z",
      summary: {
        sourceRows: 3,
        validFeeds: 1,
        parsedFeeds: 1,
        emptyFeeds: 0,
        failedFeeds: 2,
      },
      feeds: [
        {
          spaceName: "BetaMachine",
          country: "France",
          sourceWikiUrl: "https://wiki.hackerspaces.org/BetaMachine",
          finalFeedUrl: "https://www.betamachine.fr/feed/",
          feedType: "rss",
          status: "parsed_ok",
          items: [
            {
              title: "Post one",
              link: "https://www.betamachine.fr/post-1",
              publishedAt: "2025-01-01T10:00:00.000Z",
              summary: "Hello",
            },
            {
              title: "Post two",
            },
          ],
        },
      ],
      failures: [
        {
          hackerspaceName: "Akiba",
          candidateUrl: "https://t.me/akiba_space",
          errorCode: "non_feed_html",
        },
      ],
    });

    expect(html).toContain("BetaMachine");
    expect(html).toContain("France");
    expect(html).toContain("https://www.betamachine.fr/feed/");
    expect(html).toContain("Post one");
    expect(html).toContain("Hello");
    expect(html).toContain("Akiba");
    expect(html).not.toContain("<span class=\"field-label\">Author:</span>");
  });
});
