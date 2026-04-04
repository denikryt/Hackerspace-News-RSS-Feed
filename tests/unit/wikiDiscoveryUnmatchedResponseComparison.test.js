import { describe, expect, it } from "vitest";

import {
  analyzeWikiDiscoveryUnmatchedResponses,
  buildAnalysisAttemptProfile,
} from "../../src/wikiDiscoveryUnmatchedResponseComparison.js";

describe("analyzeWikiDiscoveryUnmatchedResponses", () => {
  it("builds a three-attempt default profile with incrementing retry delays", () => {
    expect(buildAnalysisAttemptProfile()).toEqual({
      attemptTimeoutsMs: [1000, 2000, 3000],
      retryDelaysMs: [1000, 2000],
    });

    expect(buildAnalysisAttemptProfile({ attemptCount: 3 })).toEqual({
      attemptTimeoutsMs: [1000, 2000, 3000],
      retryDelaysMs: [1000, 2000],
    });
  });

  it("fetches both urls for each unmatched item and classifies whether they return the same feed content", async () => {
    const logLines = [];
    const responseByUrl = new Map([
      [
        "https://wiki.example/alpha-atom.xml",
        {
          url: "https://alpha.example/atom.xml",
          status: 200,
          headers: new Headers({ "content-type": "application/atom+xml; charset=utf-8" }),
          text: async () => `<?xml version="1.0"?>
            <feed xmlns="http://www.w3.org/2005/Atom">
              <title>Alpha Feed</title>
              <link href="https://alpha.example/"/>
              <entry><id>a-1</id><title>One</title><link href="https://alpha.example/post-1"/></entry>
            </feed>`,
        },
      ],
      [
        "https://discovery.example/alpha-rss.xml",
        {
          url: "https://alpha.example/rss.xml",
          status: 200,
          headers: new Headers({ "content-type": "application/rss+xml; charset=utf-8" }),
          text: async () => `<?xml version="1.0"?>
            <rss version="2.0">
              <channel>
                <title>Alpha Feed</title>
                <link>http://alpha.example/</link>
                <item><title>One</title><link>https://alpha.example/post-1</link></item>
              </channel>
            </rss>`,
        },
      ],
      [
        "https://wiki.example/beta-feed.xml",
        {
          url: "https://beta.example/feed.xml",
          status: 200,
          headers: new Headers({ "content-type": "application/rss+xml" }),
          text: async () => `<?xml version="1.0"?>
            <rss version="2.0">
              <channel>
                <title>Beta Main Feed</title>
                <link>https://beta.example/</link>
                <item><title>Main 1</title><link>https://beta.example/post-1</link></item>
              </channel>
            </rss>`,
        },
      ],
      [
        "https://discovery.example/beta-comments.xml",
        {
          url: "https://beta.example/comments.xml",
          status: 200,
          headers: new Headers({ "content-type": "application/rss+xml" }),
          text: async () => `<?xml version="1.0"?>
            <rss version="2.0">
              <channel>
                <title>Beta Comments</title>
                <link>https://beta.example/</link>
                <item><title>Comment 1</title><link>https://beta.example/comment-1</link></item>
              </channel>
            </rss>`,
        },
      ],
    ]);

    const fetchImpl = async (url) => {
      const response = responseByUrl.get(url);
      if (!response) {
        throw new Error(`Unexpected URL ${url}`);
      }

      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        url: response.url,
        headers: response.headers,
        text: async () => response.text(),
      };
    };

    const result = await analyzeWikiDiscoveryUnmatchedResponses({
      comparisonPayload: {
        generatedAt: "2026-03-29T00:00:00.000Z",
        unmatched: [
          {
            hackerspaceName: "Alpha",
            wikiFeedUrl: "https://wiki.example/alpha-atom.xml",
            discoveryFeedUrl: "https://discovery.example/alpha-rss.xml",
            discoveryMethod: "alternate_link",
          },
          {
            hackerspaceName: "Beta",
            wikiFeedUrl: "https://wiki.example/beta-feed.xml",
            discoveryFeedUrl: "https://discovery.example/beta-comments.xml",
            discoveryMethod: "alternate_link",
          },
        ],
      },
      fetchImpl,
      logger: (line) => logLines.push(line),
    });

    expect(result.summary).toMatchObject({
      unmatchedPairs: 2,
      sameFeedContent: 1,
      differentFeedContent: 1,
    });

    expect(result.unmatchedPairs).toBeUndefined();

    expect(result.sameFeedContent).toHaveLength(1);
    expect(result.sameFeedContent[0]).toMatchObject({
      hackerspaceName: "Alpha",
      comparison: {
        verdict: "same_feed_content",
        sameFinalUrl: false,
        sameFeedIdentity: true,
        sharedItemLinksCount: 1,
      },
    });

    expect(result.differentFeedContent).toHaveLength(1);
    expect(result.differentFeedContent[0]).toMatchObject({
      hackerspaceName: "Beta",
      comparison: {
        verdict: "different_feed_content",
        sameFinalUrl: false,
        sameFeedIdentity: false,
        sharedItemLinksCount: 0,
      },
    });

    expect(result.nonXmlOrUnparseableResponse).toEqual([]);

    expect(logLines).toEqual([
      "[analyze] comparing unmatched pair 1/2: Alpha",
      "[analyze] completed unmatched pair 1/2: Alpha -> same_feed_content",
      "[analyze] comparing unmatched pair 2/2: Beta",
      "[analyze] completed unmatched pair 2/2: Beta -> different_feed_content",
    ]);
  });
});
