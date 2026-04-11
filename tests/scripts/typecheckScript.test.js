import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

describe("typecheck script", () => {
  it("runs the repository typecheck command successfully", () => {
    const stdout = execFileSync("npm", ["run", "typecheck"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(stdout).toContain("tsc --noEmit");
  });
});
