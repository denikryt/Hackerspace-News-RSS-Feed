import { describe, expect, it, vi, afterEach } from "vitest";

import { fetchPageHtml } from "../../src/pageFetcher.js";

const sourcePageUrl = "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds";

afterEach(() => {
  vi.useRealTimers();
});

describe("fetchPageHtml", () => {
  it("retries transient timeout errors with 1s, 2s, and 3s backoff before succeeding", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(fetchFailed({ code: "ETIMEDOUT" }))
      .mockRejectedValueOnce(fetchFailed({ code: "EAI_AGAIN" }))
      .mockResolvedValue(response({ url: sourcePageUrl, body: "<html>ok</html>" }));
    const waitImpl = vi.fn().mockResolvedValue(undefined);

    const html = await fetchPageHtml({
      sourcePageUrl,
      fetchImpl,
      waitImpl,
    });

    expect(html).toBe("<html>ok</html>");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(waitImpl).toHaveBeenCalledTimes(2);
    expect(waitImpl).toHaveBeenNthCalledWith(1, 1000);
    expect(waitImpl).toHaveBeenNthCalledWith(2, 2000);
  });

  it("stops after the configured retries and rethrows the last transient error", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(fetchFailed({ code: "ETIMEDOUT" }));
    const waitImpl = vi.fn().mockResolvedValue(undefined);

    await expect(
      fetchPageHtml({
        sourcePageUrl,
        fetchImpl,
        waitImpl,
      }),
    ).rejects.toThrow("fetch failed");

    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(waitImpl).toHaveBeenCalledTimes(3);
    expect(waitImpl).toHaveBeenNthCalledWith(1, 1000);
    expect(waitImpl).toHaveBeenNthCalledWith(2, 2000);
    expect(waitImpl).toHaveBeenNthCalledWith(3, 3000);
  });

  it("does not retry non-transient HTTP errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ url: sourcePageUrl, status: 503, body: "bad" }));
    const waitImpl = vi.fn().mockResolvedValue(undefined);

    await expect(
      fetchPageHtml({
        sourcePageUrl,
        fetchImpl,
        waitImpl,
      }),
    ).rejects.toThrow("Failed to fetch source page: HTTP 503");

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(waitImpl).not.toHaveBeenCalled();
  });

  it("uses 1s, 2s, and 3s attempt timeouts for transient fetch hangs", async () => {
    vi.useFakeTimers();

    const waitImpl = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = vi.fn((url, options = {}) => (
      createAbortableFetch({ url, signal: options.signal })
    ));

    const htmlPromise = fetchPageHtml({
      sourcePageUrl,
      fetchImpl,
      waitImpl,
    });
    void htmlPromise.catch(() => {});

    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(999);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(waitImpl).toHaveBeenNthCalledWith(1, 1000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1);
    expect(waitImpl).toHaveBeenNthCalledWith(2, 2000);
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(2999);
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(1);
    expect(waitImpl).toHaveBeenNthCalledWith(3, 3000);
    expect(fetchImpl).toHaveBeenCalledTimes(4);

    await vi.advanceTimersByTimeAsync(3000);

    await expect(htmlPromise).rejects.toThrow("The operation was aborted");
  });
});

function response({ url, body, status = 200 }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    text: () => Promise.resolve(body),
  };
}

function fetchFailed({ code }) {
  return Object.assign(new TypeError("fetch failed"), {
    cause: Object.assign(new Error(code), { code }),
  });
}

function createAbortableFetch({ url, signal }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    signal?.addEventListener(
      "abort",
      () => {
        queueMicrotask(() => {
          reject(abortError());
        });
      },
      { once: true },
    );
  });
}

function abortError() {
  return new DOMException("The operation was aborted", "AbortError");
}
