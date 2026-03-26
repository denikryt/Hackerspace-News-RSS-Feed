import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { selectDisplayText } from "../src/contentDisplay.js";

const fixturePath = resolve(
  process.cwd(),
  "tests/fixtures/select-display-text-real-cases.json",
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

describe("selectDisplayText with real-data-derived fixtures", () => {
  it("uses checked-in observed cases instead of local mutable snapshots", () => {
    expect(Array.isArray(fixture.cases)).toBe(true);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  it("matches the expected display contract for each recorded case", () => {
    for (const entry of fixture.cases) {
      const result = selectDisplayText(entry.input);
      expect(result).toEqual(entry.expected);
    }
  });

  it("includes an observed contentSnippet-first case from project analysis data", () => {
    const example = fixture.cases.find((entry) => entry.id === "analysis-content-snippet");

    expect(example).toBeDefined();
    expect(example.input.summaryCandidates).toEqual([
      { field: "contentSnippet", text: "Hello" },
    ]);
    expect(selectDisplayText(example.input)).toEqual(example.expected);
  });

  it("includes a long-content fallback case without storing full content in snapshots", () => {
    const example = fixture.cases.find((entry) => entry.id === "content-fallback-truncated");

    expect(example).toBeDefined();
    expect(example.expected.wasTruncated).toBe(true);
    expect(example.expected.format).toBe("text");
    expect(example.expected.text).toHaveLength(501);
  });
});
