import { describe, expect, it, vi } from "vitest";

import { runCuratedPreviewCli } from "../../../src/cli/curatedPreview.js";

describe("curated preview CLI", () => {
  it("prints help and does not run preview when --help is passed", async () => {
    const logger = vi.fn();
    const previewImpl = vi.fn();

    await runCuratedPreviewCli({
      argv: ["--help"],
      logger,
      previewImpl,
    });

    expect(previewImpl).not.toHaveBeenCalled();
    expect(logger).toHaveBeenCalledWith("Usage: npm run curated:preview");
  });

  it("runs curated preview and logs stage and summary lines", async () => {
    const logger = vi.fn();
    const previewImpl = vi.fn().mockResolvedValue({
      resolvedCount: 1,
      unresolvedCount: 2,
      outputDir: "/tmp/dist",
      pages: {
        "curated/index.html": "<html>Curated</html>",
      },
    });

    await runCuratedPreviewCli({
      logger,
      previewImpl,
    });

    expect(previewImpl).toHaveBeenCalledWith({
      logger,
      writePages: true,
    });
    expect(logger).toHaveBeenCalledWith("[preview] starting curated preview");
    expect(logger).toHaveBeenCalledWith("Resolved curated publications 1");
    expect(logger).toHaveBeenCalledWith("Unresolved curated publications 2");
    expect(logger).toHaveBeenCalledWith("Rendered 1 pages into /tmp/dist");
  });
});
