import { describe, expect, it, vi } from "vitest";

import {
  parseAnalyzeWikiDiscoveryUnmatchedResponsesArgs,
  runAnalyzeWikiDiscoveryUnmatchedResponsesCli,
} from "../../../src/cli/analyzeWikiDiscoveryUnmatchedResponses.js";

describe("analyzeWikiDiscoveryUnmatchedResponses CLI", () => {
  it("prints script help and skips analysis when --help is passed", async () => {
    const logger = vi.fn();
    const analyzeImpl = vi.fn();

    await runAnalyzeWikiDiscoveryUnmatchedResponsesCli({
      logger,
      analyzeImpl,
      argv: ["--help"],
    });

    expect(analyzeImpl).not.toHaveBeenCalled();
    expect(logger).toHaveBeenCalledWith("Usage: npm run analyze:wiki-discovery-unmatched -- [--attempt-count=N] [--retry-delays-ms=MS,...] [--attempt-timeouts-ms=MS,...]");
    expect(logger).toHaveBeenCalledWith("Defaults: three attempts, timeouts 1000/2000/3000ms, retry delays 1000/2000ms.");
  });

  it("parses attempt-count and explicit schedules from args", () => {
    expect(
      parseAnalyzeWikiDiscoveryUnmatchedResponsesArgs([
        "--attempt-count=3",
        "--retry-delays-ms=500,1500",
        "--attempt-timeouts-ms=1000,2500,4000",
      ]),
    ).toEqual({
      attemptCount: 3,
      retryDelaysMs: [500, 1500],
      attemptTimeoutsMs: [1000, 2500, 4000],
    });
  });

  it("passes parsed options into the analyzer and prints summary logs", async () => {
    const logger = vi.fn();
    const analyzeImpl = vi.fn().mockResolvedValue({
      summary: {
        unmatchedPairs: 2,
        sameFeedContent: 1,
        differentFeedContent: 1,
        nonXmlOrUnparseableResponse: 0,
      },
    });

    await runAnalyzeWikiDiscoveryUnmatchedResponsesCli({
      logger,
      analyzeImpl,
      argv: ["--attempt-count=2"],
    });

    expect(analyzeImpl).toHaveBeenCalledWith({
      writeArtifact: true,
      logger,
      attemptCount: 2,
      retryDelaysMs: undefined,
      attemptTimeoutsMs: undefined,
    });
    expect(logger).toHaveBeenCalledWith("[analyze] starting unmatched wiki/discovery response comparison");
    expect(logger).toHaveBeenCalledWith("Compared 2 unmatched wiki/discovery pairs");
  });
});
