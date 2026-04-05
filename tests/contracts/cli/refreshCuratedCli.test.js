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
    expect(logger).toHaveBeenCalledWith("Usage: npm run curated:refresh -- [--force]");
  });

  it("refreshes curated snapshot incrementally by default", async () => {
    const logger = vi.fn();
    const refreshImpl = vi.fn().mockResolvedValue({
      resolvedCount: 1,
      unresolvedCount: 2,
      outputPath: "/tmp/data/curated_publications_normalized.json",
    });

    await runRefreshCuratedCli({
      logger,
      refreshImpl,
      confirmForceImpl: vi.fn(),
    });

    expect(refreshImpl).toHaveBeenCalledWith({
      logger,
      writeSnapshot: true,
      force: false,
    });
    expect(logger).toHaveBeenCalledWith("[refresh] starting curated-only refresh");
    expect(logger).toHaveBeenCalledWith("Resolved curated publications 1");
    expect(logger).toHaveBeenCalledWith("Unresolved curated publications 2");
    expect(logger).toHaveBeenCalledWith("Wrote /tmp/data/curated_publications_normalized.json");
  });

  it("does not run force refresh until the confirmation succeeds", async () => {
    const logger = vi.fn();
    const confirmForceImpl = vi.fn().mockResolvedValue(false);
    const refreshImpl = vi.fn().mockResolvedValue({
      resolvedCount: 0,
      unresolvedCount: 0,
      outputPath: "/tmp/data/curated_publications_normalized.json",
    });

    await runRefreshCuratedCli({
      argv: ["--force"],
      logger,
      refreshImpl,
      confirmForceImpl,
    });

    expect(confirmForceImpl).toHaveBeenCalled();
    expect(refreshImpl).not.toHaveBeenCalled();
    expect(logger).toHaveBeenCalledWith("[refresh] force refresh cancelled");
  });

  it("passes force through when explicitly requested and confirmed", async () => {
    const logger = vi.fn();
    const confirmForceImpl = vi.fn().mockResolvedValue(true);
    const refreshImpl = vi.fn().mockResolvedValue({
      resolvedCount: 0,
      unresolvedCount: 0,
      outputPath: "/tmp/data/curated_publications_normalized.json",
    });

    await runRefreshCuratedCli({
      argv: ["--force"],
      logger,
      refreshImpl,
      confirmForceImpl,
    });

    expect(confirmForceImpl).toHaveBeenCalled();
    expect(refreshImpl).toHaveBeenCalledWith({
      logger,
      writeSnapshot: true,
      force: true,
    });
  });
});
