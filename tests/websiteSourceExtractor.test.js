import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { extractWebsiteSourceRows } from "../src/websiteSourceExtractor.js";

const fixturePath = resolve(
  process.cwd(),
  "tests/fixtures/source-page/list-of-hackerspaces-websites-snippet.html",
);
const html = readFileSync(fixturePath, "utf8");
const sourcePageUrl = "https://wiki.hackerspaces.org/List_of_Hacker_Spaces";

describe("extractWebsiteSourceRows", () => {
  it("extracts only rows from website tables and ignores rows without a website", () => {
    const rows = extractWebsiteSourceRows({ html, sourcePageUrl });

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.hackerspaceName)).toEqual([
      "Synergy Mill",
      "Chaos Computer Club Chemnitz",
      "SPACE",
      "C3D2",
    ]);
    expect(rows.some((row) => row.hackerspaceName === "ZKYLL – AI Learning Lab Trivandrum")).toBe(false);
  });

  it("extracts expected fields and resolves the hackerspace wiki url", () => {
    const [row] = extractWebsiteSourceRows({ html, sourcePageUrl });

    expect(row).toMatchObject({
      rowNumber: 2,
      hackerspaceName: "Synergy Mill",
      hackerspaceWikiPath: "/Synergy_Mill",
      hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Synergy_Mill",
      siteUrl: "http://www.synergymill.com/",
      country: "US",
    });
  });
});
