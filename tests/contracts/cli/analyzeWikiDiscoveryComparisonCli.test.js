import { describe, expect, it, vi } from "vitest";

import { runAnalyzeWikiDiscoveryComparisonCli } from "../../../src/cli/analyzeWikiDiscoveryComparison.js";

describe("analyzeWikiDiscoveryComparison CLI", () => {
  it("runs the comparison and logs stage and summary lines", async () => {
    const logger = vi.fn();
    const analyzeImpl = vi.fn().mockResolvedValue({
      summary: {
        wikiUrls: 12,
        matched: 8,
        unmatched: 4,
      },
    });

    await runAnalyzeWikiDiscoveryComparisonCli({
      logger,
      analyzeImpl,
    });

    expect(analyzeImpl).toHaveBeenCalledWith({ writeArtifact: true });
    expect(logger).toHaveBeenCalledWith("[analyze] starting wiki/discovery feed URL comparison");
    expect(logger).toHaveBeenCalledWith("[analyze] building wiki/discovery feed URL comparison");
    expect(logger).toHaveBeenCalledWith("[analyze] writing wiki/discovery feed URL comparison artifact");
    expect(logger).toHaveBeenCalledWith("Compared 12 wiki feed URLs");
    expect(logger).toHaveBeenCalledWith("Matched 8");
    expect(logger).toHaveBeenCalledWith("Unmatched 4");
    expect(logger).toHaveBeenCalledWith("Wrote analysis/wiki_discovery_feed_url_comparison.json");
  });
});
