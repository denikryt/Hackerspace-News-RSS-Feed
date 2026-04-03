import { describe, expect, it } from "vitest";
import { resolve } from "node:path";

import { CONTENT_DIR, PATHS } from "../../src/config.js";

describe("PATHS", () => {
  it("includes the default curated publications file in content", () => {
    expect(PATHS.curatedPublications).toBe(
      resolve(CONTENT_DIR, "curated_publications.yml"),
    );
  });
});
