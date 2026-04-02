import { describe, expect, it } from "vitest";

import { parseAuthorValue } from "../../src/authors.js";

describe("author parsing", () => {
  it("splits canonical multi-author values only by the explicit delimiter", () => {
    expect(parseAuthorValue("@Alice | Bob")).toEqual({
      rawAuthor: "@Alice | Bob",
      normalizedAuthorDisplay: "Alice | Bob",
      derivedAuthors: ["Alice", "Bob"],
      sourceRule: "canonical_delimiter",
    });
  });

  it("keeps comma-separated legacy values as one author when no override exists", () => {
    expect(parseAuthorValue("Arnold, David", { authorOverrides: {} })).toEqual({
      rawAuthor: "Arnold, David",
      normalizedAuthorDisplay: "Arnold, David",
      derivedAuthors: ["Arnold, David"],
      sourceRule: "single_raw",
    });
  });

  it("uses explicit overrides for known legacy multi-author values", () => {
    expect(
      parseAuthorValue("kuchenblechmafia, s3lph", {
        authorOverrides: {
          "kuchenblechmafia, s3lph": ["kuchenblechmafia", "s3lph"],
        },
      }),
    ).toEqual({
      rawAuthor: "kuchenblechmafia, s3lph",
      normalizedAuthorDisplay: "kuchenblechmafia, s3lph",
      derivedAuthors: ["kuchenblechmafia", "s3lph"],
      sourceRule: "override",
    });
  });

  it("loads known legacy overrides from the project config", () => {
    expect(parseAuthorValue("kuchenblechmafia, s3lph").derivedAuthors).toEqual([
      "kuchenblechmafia",
      "s3lph",
    ]);
  });
});
