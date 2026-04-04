import { describe, expect, it, vi } from "vitest";

import { analyzeContentComparison } from "../../src/cli/analyzeContentComparison.js";

describe("analyzeContentComparison", () => {
  it("logs pipeline stages and feed collection progress for direct analysis runs", async () => {
    const logger = vi.fn();
    const loadAnalysisSourceRowsImpl = vi.fn().mockResolvedValue({
      sourceRows: [{ hackerspaceName: "Alpha", candidateFeedUrl: "https://alpha.example/feed.xml" }],
    });
    const collectAnalysisFeedsImpl = vi.fn().mockResolvedValue({
      records: [
        {
          status: "parsed",
          sourceRow: { hackerspaceName: "Alpha", candidateFeedUrl: "https://alpha.example/feed.xml" },
          validation: { finalUrl: "https://alpha.example/feed.xml" },
          parsedFeed: {
            items: [{ title: "Post", content: "<p>Body</p>", summary: "Body" }],
          },
        },
      ],
    });
    const writeContentComparisonArtifactImpl = vi.fn().mockResolvedValue(undefined);

    await analyzeContentComparison({
      logger,
      writeArtifact: true,
      loadAnalysisSourceRowsImpl,
      collectAnalysisFeedsImpl,
      writeContentComparisonArtifactImpl,
    });

    expect(logger).toHaveBeenCalledWith("[analyze] loading source rows");
    expect(logger).toHaveBeenCalledWith("[analyze] collecting feeds");
    expect(logger).toHaveBeenCalledWith("[analyze] building content comparison report");
    expect(logger).toHaveBeenCalledWith("[analyze] writing content comparison artifact");
    expect(collectAnalysisFeedsImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        logger,
      }),
    );
  });
});
