import { describe, expect, it } from "vitest";

import { readFixtureText } from "../_shared/paths.js";

import { extractSourceRows } from "../../src/sourceTableExtractor.js";

const html = readFixtureText("source-page", "user-jomat-oldid-94788-snippet.html");
const sourcePageUrl = "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds";

describe("extractSourceRows", () => {
  it("extracts only rows from the Spaces_with_RSS_feeds table", () => {
    const rows = extractSourceRows({ html, sourcePageUrl });

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.rowNumber)).toEqual([1, 2, 48]);
    expect(rows.some((row) => row.hackerspaceName === "Ignored")).toBe(false);
  });

  it("extracts the expected fields and resolves the wiki url", () => {
    const [row] = extractSourceRows({ html, sourcePageUrl });

    expect(row).toMatchObject({
      rowNumber: 1,
      hackerspaceName: "Akiba",
      hackerspaceWikiPath: "/Akiba",
      hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Akiba",
      candidateFeedUrl: "https://t.me/akiba_space",
      country: "Russian Federation",
    });
  });

  it("decodes html entities in feed urls", () => {
    const rows = extractSourceRows({ html, sourcePageUrl });
    const row = rows.find((entry) => entry.rowNumber === 48);

    expect(row.candidateFeedUrl).toBe(
      "https://trac.raumfahrtagentur.org/blog?format=rss&user=anonymous",
    );
  });
});
