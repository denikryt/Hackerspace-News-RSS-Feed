import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { resolveRepoPath } from "../_shared/paths.js";

describe("test layer guidance", () => {
  it("documents fixture ownership, duplicate-assertion guidance, and where new tests should go", () => {
    const readme = readFileSync(resolveRepoPath("tests", "README.md"), "utf8");

    expect(readme).toContain("## Fixture ownership");
    expect(readme).toContain("## Avoiding duplicate assertions");
    expect(readme).toContain("## Adding new tests");
    expect(readme).toContain("tests/fixtures/");
  });
});
