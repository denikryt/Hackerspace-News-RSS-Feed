import { describe, expect, it, vi } from "vitest";

import { runAnalyzeContentComparisonCli } from "../../../src/cli/analyzeContentComparison.js";

describe("analyzeContentComparison CLI", () => {
  it("runs the analysis and logs start and artifact summary", async () => {
    const logger = vi.fn();
    const analyzeImpl = vi.fn().mockResolvedValue({
      examples: [{ itemTitle: "Example" }, { itemTitle: "Second" }],
      outputPath: "/tmp/analysis/content_comparison.json",
    });

    await runAnalyzeContentComparisonCli({
      logger,
      analyzeImpl,
    });

    expect(analyzeImpl).toHaveBeenCalledWith({
      logger,
      writeArtifact: true,
    });
    expect(logger).toHaveBeenCalledWith("[analyze] starting content comparison");
    expect(logger).toHaveBeenCalledWith("Written 2 examples to /tmp/analysis/content_comparison.json");
  });
});
