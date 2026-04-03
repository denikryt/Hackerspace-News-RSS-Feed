import { describe, expect, it, vi } from "vitest";

import { collectAnalysisFeeds } from "../../../src/analysisFeedCollection.js";

describe("collectAnalysisFeeds", () => {
  it("collects parsed feeds and preserves validation and parse failures", async () => {
    const sourceRows = [
      {
        rowNumber: 1,
        hackerspaceName: "Alpha",
        candidateFeedUrl: "https://alpha.example/feed.xml",
      },
      {
        rowNumber: 2,
        hackerspaceName: "Beta",
        candidateFeedUrl: "https://beta.example/feed.xml",
      },
      {
        rowNumber: 3,
        hackerspaceName: "Gamma",
        candidateFeedUrl: "https://gamma.example/feed.xml",
      },
    ];
    const probeFeedUrlImpl = vi.fn(async ({ sourceRow }) => {
      if (sourceRow.hackerspaceName === "Beta") {
        return {
          candidateUrl: sourceRow.candidateFeedUrl,
          finalUrl: sourceRow.candidateFeedUrl,
          fetchOk: false,
          isParsable: false,
          body: null,
          errorCode: "http_error",
          errorMessage: "HTTP 500",
        };
      }

      return {
        candidateUrl: sourceRow.candidateFeedUrl,
        finalUrl: sourceRow.candidateFeedUrl,
        fetchOk: true,
        isParsable: true,
        body: `<rss><channel><title>${sourceRow.hackerspaceName}</title></channel></rss>`,
        errorCode: null,
        errorMessage: undefined,
      };
    });
    const parseFeedBodyImpl = vi.fn(async ({ validation }) => {
      if (validation.finalUrl.includes("gamma")) {
        throw new Error("Malformed XML");
      }

      return {
        title: "Alpha feed",
        items: [{ title: "Post one" }],
      };
    });

    const result = await collectAnalysisFeeds({
      sourceRows,
      probeFeedUrlImpl,
      parseFeedBodyImpl,
      concurrency: 2,
    });

    expect(result.records).toEqual([
      expect.objectContaining({
        sourceRow: sourceRows[0],
        rawXmlBody: "<rss><channel><title>Alpha</title></channel></rss>",
        status: "parsed",
        parsedFeed: expect.objectContaining({ title: "Alpha feed" }),
        parseError: null,
      }),
      expect.objectContaining({
        sourceRow: sourceRows[1],
        rawXmlBody: null,
        status: "validation_error",
        parsedFeed: null,
        parseError: null,
        validation: expect.objectContaining({ errorCode: "http_error" }),
      }),
      expect.objectContaining({
        sourceRow: sourceRows[2],
        rawXmlBody: "<rss><channel><title>Gamma</title></channel></rss>",
        status: "parse_error",
        parsedFeed: null,
        parseError: expect.objectContaining({ message: "Malformed XML" }),
      }),
    ]);
    expect(result.parsedFeedRecords).toHaveLength(1);
    expect(result.failedFeedRecords).toHaveLength(2);
  });

  it("respects the configured concurrency cap and restores source-row order", async () => {
    const sourceRows = Array.from({ length: 6 }, (_, index) => ({
      rowNumber: index + 1,
      hackerspaceName: `Space ${index + 1}`,
      candidateFeedUrl: `https://example.com/feed-${index + 1}.xml`,
    }));

    let activeCount = 0;
    let peakConcurrency = 0;

    const probeFeedUrlImpl = vi.fn(async ({ sourceRow }) => {
      activeCount += 1;
      peakConcurrency = Math.max(peakConcurrency, activeCount);
      await wait(10);
      activeCount -= 1;

      return {
        candidateUrl: sourceRow.candidateFeedUrl,
        finalUrl: sourceRow.candidateFeedUrl,
        fetchOk: true,
        isParsable: true,
        body: `<rss><channel><title>${sourceRow.hackerspaceName}</title></channel></rss>`,
        errorCode: null,
        errorMessage: undefined,
      };
    });
    const parseFeedBodyImpl = vi.fn(async ({ validation }) => ({
      title: validation.finalUrl,
      items: [],
    }));

    const result = await collectAnalysisFeeds({
      sourceRows,
      probeFeedUrlImpl,
      parseFeedBodyImpl,
      concurrency: 2,
    });

    expect(peakConcurrency).toBe(2);
    expect(result.records.map((record) => record.sourceRow.candidateFeedUrl)).toEqual(
      sourceRows.map((row) => row.candidateFeedUrl),
    );
  });

  it("logs collection progress so long runs stay visible", async () => {
    const logger = vi.fn();
    const sourceRows = [
      {
        rowNumber: 1,
        hackerspaceName: "Alpha",
        candidateFeedUrl: "https://alpha.example/feed.xml",
      },
      {
        rowNumber: 2,
        hackerspaceName: "Beta",
        candidateFeedUrl: "https://beta.example/feed.xml",
      },
    ];
    const probeFeedUrlImpl = vi.fn(async ({ sourceRow }) => ({
      candidateUrl: sourceRow.candidateFeedUrl,
      finalUrl: sourceRow.candidateFeedUrl,
      fetchOk: true,
      isParsable: true,
      body: `<rss><channel><title>${sourceRow.hackerspaceName}</title></channel></rss>`,
      errorCode: null,
      errorMessage: undefined,
    }));
    const parseFeedBodyImpl = vi.fn(async () => ({
      title: "Feed",
      items: [],
    }));

    await collectAnalysisFeeds({
      sourceRows,
      probeFeedUrlImpl,
      parseFeedBodyImpl,
      logger,
      concurrency: 1,
    });

    expect(logger).toHaveBeenCalledWith("[analyze] collecting feed 1/2: https://alpha.example/feed.xml");
    expect(logger).toHaveBeenCalledWith("[analyze] collected feed 1/2: https://alpha.example/feed.xml (parsed)");
    expect(logger).toHaveBeenCalledWith("[analyze] collecting feed 2/2: https://beta.example/feed.xml");
    expect(logger).toHaveBeenCalledWith("[analyze] collected feed 2/2: https://beta.example/feed.xml (parsed)");
  });
});

function wait(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
