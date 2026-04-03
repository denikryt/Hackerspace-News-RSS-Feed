import { readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("test suite layout", () => {
  it("uses the canonical layered test directories instead of root-level test files", () => {
    const testsDir = resolve(process.cwd(), "tests");
    const entries = readdirSync(testsDir, { withFileTypes: true });

    const directoryNames = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const rootTestFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".test.js"))
      .map((entry) => entry.name)
      .sort();

    expect(directoryNames).toEqual(expect.arrayContaining([
      "_shared",
      "architecture",
      "contracts",
      "fixtures",
      "integration",
      "real-data",
      "scripts",
      "unit",
    ]));
    expect(rootTestFiles).toEqual([]);
  });
});
