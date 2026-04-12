import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { loadAboutHtmlBoundary } from "../../src/renderers/aboutHtmlBoundary.js";

describe("aboutHtmlBoundary", () => {
  it("loads the hand-maintained about html from the content boundary without escaping it", () => {
    const expectedHtml = readFileSync(resolve(process.cwd(), "content/about.html"), "utf8");

    expect(loadAboutHtmlBoundary()).toBe(expectedHtml);
    expect(loadAboutHtmlBoundary()).toContain("<strong>Data Sources:</strong>");
  });
});
