import { describe, expect, it, vi } from "vitest";

import { runAnalyzeCli } from "../../../src/cli/analyze.js";

describe("analyze CLI", () => {
  it("prints help and does not run the analysis", async () => {
    const logger = vi.fn();
    const loadAnalysisSourceRowsImpl = vi.fn();

    await runAnalyzeCli({
      argv: ["--help"],
      logger,
      loadAnalysisSourceRowsImpl,
    });

    expect(loadAnalysisSourceRowsImpl).not.toHaveBeenCalled();
    expect(logger).toHaveBeenCalledWith("Usage: npm run analyze -- [--include-discovery-valid]");
  });

  it("keeps wiki-only analysis by default and logs the selected source set", async () => {
    const logger = vi.fn();
    const loadAnalysisSourceRowsImpl = vi.fn().mockResolvedValue({
      sourceRows: [{ candidateFeedUrl: "https://alpha.example/feed.xml" }],
      selectedSourceMode: "wiki",
      wikiSourceCount: 1,
      discoveryValidSourceCount: 0,
      dedupedSourceCount: 1,
    });
    const collectAnalysisFeedsImpl = vi.fn().mockResolvedValue({
      records: [],
      parsedFeedRecords: [],
      failedFeedRecords: [],
    });
    const analyzeFeedFieldsImpl = vi.fn().mockResolvedValue({ analyzedFeedCount: 0 });
    const analyzeContentComparisonImpl = vi.fn().mockResolvedValue({ examples: [] });
    const writeFeedFieldInventoryArtifactsImpl = vi.fn();
    const writeContentComparisonArtifactImpl = vi.fn();

    await runAnalyzeCli({
      argv: [],
      logger,
      loadAnalysisSourceRowsImpl,
      collectAnalysisFeedsImpl,
      analyzeFeedFieldsImpl,
      analyzeContentComparisonImpl,
      writeFeedFieldInventoryArtifactsImpl,
      writeContentComparisonArtifactImpl,
    });

    expect(loadAnalysisSourceRowsImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        includeDiscoveryValid: false,
      }),
    );
    expect(logger).toHaveBeenCalledWith("[analyze] starting analysis run");
    expect(logger).toHaveBeenCalledWith("[analyze] loading source rows");
    expect(logger).toHaveBeenCalledWith("[analyze] collecting feeds");
    expect(logger).toHaveBeenCalledWith("[analyze] building feed field inventory");
    expect(logger).toHaveBeenCalledWith("[analyze] building content comparison");
    expect(logger).toHaveBeenCalledWith("[analyze] writing analysis artifacts");
    expect(logger).toHaveBeenCalledWith("[analyze] source mode: wiki");
    expect(logger).toHaveBeenCalledWith("[analyze] selected 1 source rows (wiki=1, discovery-valid=0, deduped=1)");
  });

  it("includes discovery-valid rows only when the flag is present", async () => {
    const logger = vi.fn();
    const loadAnalysisSourceRowsImpl = vi.fn().mockResolvedValue({
      sourceRows: [
        { candidateFeedUrl: "https://alpha.example/feed.xml" },
        { candidateFeedUrl: "https://beta.example/feed.xml" },
      ],
      selectedSourceMode: "wiki+discovery-valid",
      wikiSourceCount: 1,
      discoveryValidSourceCount: 1,
      dedupedSourceCount: 2,
    });
    const collectAnalysisFeedsImpl = vi.fn().mockResolvedValue({
      records: [],
      parsedFeedRecords: [],
      failedFeedRecords: [],
    });
    const analyzeFeedFieldsImpl = vi.fn().mockResolvedValue({ analyzedFeedCount: 0 });
    const analyzeContentComparisonImpl = vi.fn().mockResolvedValue({ examples: [] });
    const writeFeedFieldInventoryArtifactsImpl = vi.fn();
    const writeContentComparisonArtifactImpl = vi.fn();

    await runAnalyzeCli({
      argv: ["--include-discovery-valid"],
      logger,
      loadAnalysisSourceRowsImpl,
      collectAnalysisFeedsImpl,
      analyzeFeedFieldsImpl,
      analyzeContentComparisonImpl,
      writeFeedFieldInventoryArtifactsImpl,
      writeContentComparisonArtifactImpl,
    });

    expect(loadAnalysisSourceRowsImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        includeDiscoveryValid: true,
      }),
    );
    expect(logger).toHaveBeenCalledWith("[analyze] starting analysis run");
    expect(logger).toHaveBeenCalledWith("[analyze] loading source rows");
    expect(logger).toHaveBeenCalledWith("[analyze] collecting feeds");
    expect(logger).toHaveBeenCalledWith("[analyze] source mode: wiki+discovery-valid");
    expect(logger).toHaveBeenCalledWith("[analyze] selected 2 source rows (wiki=1, discovery-valid=1, deduped=2)");
  });
});
