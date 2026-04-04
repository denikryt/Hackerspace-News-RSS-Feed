import { describe, expect, it, vi } from "vitest";

import { runRefreshCuratedCli } from "../../../src/cli/refreshCurated.js";

describe("refresh curated CLI", () => {
  it("prints help and does not run refresh when --help is passed", async () => {
    const logger = vi.fn();
    const refreshImpl = vi.fn();

    await runRefreshCuratedCli({
      argv: ["--help"],
      logger,
      refreshImpl,
    });

    expect(refreshImpl).not.toHaveBeenCalled();
    expect(logger).toHaveBeenCalledWith("Usage: npm run curated:refresh");
  });

  it("refreshes curated snapshot and logs summary lines", async () => {
    const logger = vi.fn();
    const refreshImpl = vi.fn().mockResolvedValue({
      resolvedCount: 1,
      unresolvedCount: 2,
      outputPath: "/tmp/data/curated_publications_normalized.json",
    });

    await runRefreshCuratedCli({
      logger,
      refreshImpl,
    });

    expect(refreshImpl).toHaveBeenCalledWith({
      logger,
      writeSnapshot: true,
    });
    expect(logger).toHaveBeenCalledWith("[refresh] starting curated-only refresh");
    expect(logger).toHaveBeenCalledWith("Resolved curated publications 1");
    expect(logger).toHaveBeenCalledWith("Unresolved curated publications 2");
    expect(logger).toHaveBeenCalledWith("Wrote /tmp/data/curated_publications_normalized.json");
  });
});
