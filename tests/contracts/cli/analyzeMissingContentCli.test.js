import { describe, expect, it, vi } from "vitest";

import { runAnalyzeMissingContentCli } from "../../../src/cli/analyzeMissingContent.js";

describe("analyze missing content CLI", () => {
  it("prints help and does not run the analysis", async () => {
    const logger = vi.fn();
    const analyzeImpl = vi.fn();

    await runAnalyzeMissingContentCli({
      argv: ["--help"],
      logger,
      analyzeImpl,
    });

    expect(analyzeImpl).not.toHaveBeenCalled();
    expect(logger).toHaveBeenCalledWith(
      "Usage: npm run analyze:item-content-tags -- [--include-discovery-valid]",
    );
  });

  it("runs the analysis and logs the summary", async () => {
    const logger = vi.fn();
    const analyzeImpl = vi.fn().mockResolvedValue({
      totalPublicationCount: 10,
      itemsWithContentCount: 4,
      itemsWithDescriptionCount: 6,
      analyzedFeedCount: 2,
      outputPath: "analysis/missing_content_analysis.json",
    });

    await runAnalyzeMissingContentCli({
      argv: ["--include-discovery-valid"],
      logger,
      analyzeImpl,
    });

    expect(analyzeImpl).toHaveBeenCalledWith({
      includeDiscoveryValid: true,
      logger,
      writeArtifact: true,
    });
    expect(logger).toHaveBeenCalledWith("[analyze] starting missing content analysis");
    expect(logger).toHaveBeenCalledWith("Parsed feeds 2");
    expect(logger).toHaveBeenCalledWith("Publications analyzed 10");
    expect(logger).toHaveBeenCalledWith("Items with raw content/content:encoded 4");
    expect(logger).toHaveBeenCalledWith("Items with raw description 6");
    expect(logger).toHaveBeenCalledWith("Wrote analysis/missing_content_analysis.json");
  });
});
