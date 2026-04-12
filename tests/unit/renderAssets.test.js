import { describe, expect, it } from "vitest";
import { relative, resolve } from "node:path";

import {
  AUTHORS_INDEX_SCRIPT_HREF,
  FEED_COUNTRY_SELECT_SCRIPT_HREF,
  SITE_CSS_HREF,
  SPACES_INDEX_SCRIPT_HREF,
  listStaticRenderAssets,
} from "../../src/renderAssets.js";

describe("renderAssets", () => {
  it("exposes stable public hrefs for shared render assets", () => {
    expect(SITE_CSS_HREF).toBe("/site.css");
    expect(FEED_COUNTRY_SELECT_SCRIPT_HREF).toBe("/feed-country-select.js");
    expect(SPACES_INDEX_SCRIPT_HREF).toBe("/spaces-index.js");
    expect(AUTHORS_INDEX_SCRIPT_HREF).toBe("/authors-index.js");
  });

  it("lists the static asset manifest copied into dist during render", () => {
    const assets = listStaticRenderAssets();

    expect(assets.map((asset) => asset.outputPath)).toEqual([
      "favicon.png",
      "site.css",
      "feed-country-select.js",
      "spaces-index.js",
      "authors-index.js",
    ]);

    expect(assets.map((asset) => relative(resolve(process.cwd(), "static"), asset.sourcePath))).toEqual([
      "favicon.png",
      "site.css",
      "feed-country-select.js",
      "spaces-index.js",
      "authors-index.js",
    ]);
  });
});
