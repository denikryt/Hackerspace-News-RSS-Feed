import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { runBuildCli, runNodeStage } from "../../../src/cli/build.js";

// Exercise the process boundary without starting acquisition or publishing.
describe("build child lifecycle", () => {
  it("waits for close and inherits stdio and the current environment", async () => {
    const child = new EventEmitter();
    const spawnImpl = vi.fn(() => child);
    const env = { TEST_STAGE: "yes" };
    let finished = false;
    const result = runNodeStage("refresh", ["--include-discovery-valid"], { spawnImpl, env }).then(() => { finished = true; });
    expect(spawnImpl).toHaveBeenCalledWith(process.execPath, [expect.stringMatching(/cli\/refresh.js$/), "--include-discovery-valid"], { stdio: "inherit", env });
    child.emit("exit", 0);
    await Promise.resolve();
    expect(finished).toBe(false);
    child.emit("close", 0);
    await result;
    expect(finished).toBe(true);
  });

  it.each(["SIGINT", "SIGTERM"])("forwards %s, awaits close and never starts the next stage", async signal => {
    const source = new EventEmitter();
    const child = new EventEmitter();
    child.kill = vi.fn();
    const spawnImpl = vi.fn(() => child);
    const runStageImpl = vi.fn(async stage => {
      const controller = new AbortController();
      source.once(signal, () => controller.abort(signal));
      const pending = runNodeStage(stage, [], { signal: controller.signal, spawnImpl });
      source.emit(signal);
      expect(child.kill).toHaveBeenCalledWith(signal);
      child.emit("close", null, signal);
      await pending;
    });
    await expect(runBuildCli({ argv: [], env: {}, signalSource: source, runStageImpl })).rejects.toMatchObject({ signal, exitCode: signal === "SIGINT" ? 130 : 143 });
    expect(runStageImpl).toHaveBeenCalledTimes(1);
    expect(source.listenerCount("SIGINT")).toBe(0);
    expect(source.listenerCount("SIGTERM")).toBe(0);
  });

  it("rejects a nonzero child exit and spawn error", async () => {
    for (const failure of ["exit", "spawn"]) {
      const child = new EventEmitter();
      const result = runNodeStage("render", [], { spawnImpl: () => child });
      const check = expect(result).rejects.toThrow();
      if (failure === "exit") child.emit("close", 17, null);
      else child.emit("error", new Error("ENOENT"));
      await check;
    }
  });
});
