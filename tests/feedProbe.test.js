import { describe, expect, it, vi } from "vitest";

import { probeFeedUrl } from "../src/feedProbe.js";

describe("probeFeedUrl", () => {
  it("marks XML feed responses as parsable feeds", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: "https://example.com/feed.xml",
      headers: new Headers({ "content-type": "application/rss+xml; charset=utf-8" }),
      text: () => Promise.resolve("<?xml version=\"1.0\"?><rss><channel><title>X</title></channel></rss>"),
    });

    const result = await probeFeedUrl({
      sourceRow: { candidateFeedUrl: "https://example.com/feed.xml" },
      fetchImpl,
    });

    expect(result).toMatchObject({
      candidateUrl: "https://example.com/feed.xml",
      finalUrl: "https://example.com/feed.xml",
      httpStatus: 200,
      fetchOk: true,
      isFeedLike: true,
      isParsable: true,
      detectedFormat: "rss",
    });
  });

  it("marks Telegram-like HTML pages as non_feed_html", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: "https://t.me/akiba_space",
      headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
      text: () => Promise.resolve("<html><body>telegram page</body></html>"),
    });

    const result = await probeFeedUrl({
      sourceRow: { candidateFeedUrl: "https://t.me/akiba_space" },
      fetchImpl,
    });

    expect(result).toMatchObject({
      fetchOk: true,
      isFeedLike: false,
      isParsable: false,
      errorCode: "non_feed_html",
    });
  });
});
