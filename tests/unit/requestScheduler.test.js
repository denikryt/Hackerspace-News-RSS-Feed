import { describe, expect, it, vi } from "vitest";

import { createRequestScheduler } from "../../src/requestScheduler.js";

describe("createRequestScheduler", () => {
  it("caps active tasks at the configured concurrency", async () => {
    const scheduler = createRequestScheduler({
      concurrency: 2,
      minDelayMs: 0,
      waitImpl: vi.fn().mockResolvedValue(undefined),
    });

    let activeCount = 0;
    let peakConcurrency = 0;
    const releases = [];

    const tasks = Array.from({ length: 5 }, (_, index) =>
      scheduler.schedule(async () => {
        activeCount += 1;
        peakConcurrency = Math.max(peakConcurrency, activeCount);
        await new Promise((resolve) => {
          releases[index] = resolve;
        });
        activeCount -= 1;
        return index;
      }),
    );

    await flush();
    expect(peakConcurrency).toBe(2);

    releases[0]();
    releases[1]();
    await flush();
    releases[2]();
    releases[3]();
    await flush();
    releases[4]();

    await expect(Promise.all(tasks)).resolves.toEqual([0, 1, 2, 3, 4]);
  });

  it("waits between request starts after the first one", async () => {
    const waitImpl = vi.fn().mockResolvedValue(undefined);
    const scheduler = createRequestScheduler({
      concurrency: 6,
      minDelayMs: 250,
      waitImpl,
    });

    await Promise.all([
      scheduler.schedule(async () => "a"),
      scheduler.schedule(async () => "b"),
      scheduler.schedule(async () => "c"),
    ]);

    expect(waitImpl).toHaveBeenCalledTimes(2);
    expect(waitImpl).toHaveBeenNthCalledWith(1, 250);
    expect(waitImpl).toHaveBeenNthCalledWith(2, 250);
  });
});

function flush() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
