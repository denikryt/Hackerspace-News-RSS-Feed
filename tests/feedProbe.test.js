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

  it("retries transient network errors before parsing a feed response", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(fetchFailed({ code: "ETIMEDOUT" }))
      .mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://example.com/feed.xml",
        headers: new Headers({ "content-type": "application/rss+xml; charset=utf-8" }),
        text: () => Promise.resolve("<?xml version=\"1.0\"?><rss><channel><title>X</title></channel></rss>"),
      });
    const waitImpl = vi.fn().mockResolvedValue(undefined);
    const logger = vi.fn();

    const result = await probeFeedUrl({
      sourceRow: { candidateFeedUrl: "https://example.com/feed.xml" },
      fetchImpl,
      waitImpl,
      logger,
    });

    expect(result).toMatchObject({
      fetchOk: true,
      isParsable: true,
      detectedFormat: "rss",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(waitImpl).toHaveBeenCalledTimes(1);
    expect(waitImpl).toHaveBeenCalledWith(1000);
    expect(logger).toHaveBeenCalledWith(
      "[refresh] retrying feed fetch: https://example.com/feed.xml after ETIMEDOUT (attempt 2/4, wait 1000ms)",
    );
  });

  it("does not retry plain http feed responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      url: "https://example.com/feed.xml",
      headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
      text: () => Promise.resolve("<html>not found</html>"),
    });
    const waitImpl = vi.fn().mockResolvedValue(undefined);

    const result = await probeFeedUrl({
      sourceRow: { candidateFeedUrl: "https://example.com/feed.xml" },
      fetchImpl,
      waitImpl,
    });

    expect(result).toMatchObject({
      fetchOk: false,
      errorCode: "http_error",
      errorMessage: "HTTP 404",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(waitImpl).not.toHaveBeenCalled();
  });
});

function fetchFailed({ code }) {
  return Object.assign(new TypeError("fetch failed"), {
    cause: Object.assign(new Error(code), { code }),
  });
}
