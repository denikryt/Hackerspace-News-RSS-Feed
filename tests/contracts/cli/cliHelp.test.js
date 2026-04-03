import { describe, expect, it, vi } from "vitest";

import { runBuildCli } from "../../../src/cli/build.js";
import { runRefreshCli } from "../../../src/cli/refresh.js";

describe("CLI help", () => {
  it("prints build help and does not run refresh or render", async () => {
    const logger = vi.fn();
    const refreshImpl = vi.fn();
    const renderImpl = vi.fn();

    await runBuildCli({
      argv: ["--help"],
      logger,
      refreshImpl,
      renderImpl,
    });

    expect(refreshImpl).not.toHaveBeenCalled();
    expect(renderImpl).not.toHaveBeenCalled();
    expect(logger).toHaveBeenCalledWith("Usage: npm run build -- [--include-discovery-valid]");
  });

  it("prints refresh help and does not run refresh", async () => {
    const logger = vi.fn();
    const refreshImpl = vi.fn();

    await runRefreshCli({
      argv: ["--help"],
      logger,
      refreshImpl,
    });

    expect(refreshImpl).not.toHaveBeenCalled();
    expect(logger).toHaveBeenCalledWith("Usage: npm run refresh -- [--include-discovery-valid]");
  });
});
