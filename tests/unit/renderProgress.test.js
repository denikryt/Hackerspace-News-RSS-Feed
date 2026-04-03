import { describe, expect, it } from "vitest";

import {
  formatLoopProgressLog,
  formatPrimaryStreamProgressLog,
} from "../../src/renderProgress.js";

describe("formatPrimaryStreamProgressLog", () => {
  it("formats the first primary-stream checkpoint without elapsed time", () => {
    expect(
      formatPrimaryStreamProgressLog({
        currentPage: 1,
        totalPages: 1491,
        lastCheckpointAt: 1000,
        checkpointAt: 1000,
      }),
    ).toEqual({
      message: "[render] primary stream progress: page 1/1491",
      checkpointAt: 1000,
    });
  });

  it("formats later checkpoints with elapsed time", () => {
    expect(
      formatPrimaryStreamProgressLog({
        currentPage: 100,
        totalPages: 1491,
        lastCheckpointAt: 1000,
        checkpointAt: 2500,
      }),
    ).toEqual({
      message: "[render] primary stream progress: page 100/1491 (+1500ms)",
      checkpointAt: 2500,
    });
  });

  it("formats generic loop checkpoints with elapsed time", () => {
    expect(
      formatLoopProgressLog({
        label: "author pages",
        currentIndex: 100,
        totalItems: 876,
        lastCheckpointAt: 1000,
        checkpointAt: 2400,
      }),
    ).toEqual({
      message: "[render] author pages progress: item 100/876 (+1400ms)",
      checkpointAt: 2400,
    });
  });
});
