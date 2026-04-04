import { describe, expect, it, vi } from "vitest";

import { runRenderCuratedCli } from "../../../src/cli/renderCurated.js";

describe("render curated CLI", () => {
  it("prints help and does not run render when --help is passed", async () => {
    const logger = vi.fn();
    const renderImpl = vi.fn();

    await runRenderCuratedCli({
      argv: ["--help"],
      logger,
      renderImpl,
    });

    expect(renderImpl).not.toHaveBeenCalled();
    expect(logger).toHaveBeenCalledWith("Usage: npm run curated:render");
  });

  it("renders curated from local snapshots and logs summary lines", async () => {
    const logger = vi.fn();
    const renderImpl = vi.fn().mockResolvedValue({
      outputDir: "/tmp/dist",
      pages: {
        "curated/index.html": "<html>Curated</html>",
      },
    });

    await runRenderCuratedCli({
      logger,
      renderImpl,
    });

    expect(renderImpl).toHaveBeenCalledWith({
      logger,
      writePages: true,
    });
    expect(logger).toHaveBeenCalledWith("[render] starting curated-only render");
    expect(logger).toHaveBeenCalledWith("Rendered 1 pages into /tmp/dist");
  });
});
