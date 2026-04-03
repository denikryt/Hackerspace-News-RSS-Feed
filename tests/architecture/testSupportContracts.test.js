import { describe, expect, it } from "vitest";

import {
  cleanupTrackedTempDirs,
  createTrackedTempDir,
  createTempDirTracker,
} from "../_shared/tempDirs.js";

describe("test support contracts", () => {
  it("provides tracked temp directory helpers for migrated layered tests", async () => {
    const trackedDirs = createTempDirTracker();

    const firstDir = await createTrackedTempDir("hnf-temp-contract-", trackedDirs);
    const secondDir = await createTrackedTempDir("hnf-temp-contract-", trackedDirs);

    expect(firstDir).not.toBe(secondDir);
    expect(trackedDirs).toEqual([firstDir, secondDir]);

    await cleanupTrackedTempDirs(trackedDirs);

    expect(trackedDirs).toEqual([]);
  });
});
