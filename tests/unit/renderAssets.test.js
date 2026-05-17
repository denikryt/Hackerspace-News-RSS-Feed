import { describe, expect, it } from "vitest";
import { relative, resolve } from "node:path";

import {
  AUTHORS_INDEX_SCRIPT_HREF,
  CALENDAR_TIME_SCRIPT_HREF,
  NEWSPAPER_NAV_SCRIPT_HREF,
  SITE_CSS_HREF,
  SPACES_INDEX_SCRIPT_HREF,
  listStaticRenderAssets,
} from "../../src/renderAssets.js";

describe("renderAssets", () => {
  it("exposes stable public hrefs for shared render assets", () => {
    expect(SITE_CSS_HREF).toBe("/site.css");
    expect(SPACES_INDEX_SCRIPT_HREF).toBe("/spaces-index.js");
    expect(AUTHORS_INDEX_SCRIPT_HREF).toBe("/authors-index.js");
    expect(CALENDAR_TIME_SCRIPT_HREF).toBe("/calendar-time.js");
    expect(NEWSPAPER_NAV_SCRIPT_HREF).toBe("/newspaper-nav.js");
  });

  it("lists the static asset manifest copied into dist during render", () => {
    const assets = listStaticRenderAssets();

    expect(assets.map((asset) => asset.outputPath)).toEqual([
      "favicon.png",
      "site.css",
      "spaces-index.js",
      "authors-index.js",
      "calendar-time.js",
      "static/newspaper.css",
      "newspaper-nav.js",
    ]);

    expect(assets.map((asset) => relative(resolve(process.cwd(), "static"), asset.sourcePath))).toEqual([
      "favicon.png",
      "site.css",
      "spaces-index.js",
      "authors-index.js",
      "calendar-time.js",
      "newspaper.css",
      "newspaper-nav.js",
    ]);
  });
});
