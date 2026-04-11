import { resolve } from "node:path";

// Shared asset hrefs stay explicit so renderers and renderSite use one contract.
export const SITE_CSS_HREF = "/site.css";
export const FEED_COUNTRY_SELECT_SCRIPT_HREF = "/feed-country-select.js";
export const SPACES_INDEX_SCRIPT_HREF = "/spaces-index.js";
export const AUTHORS_INDEX_SCRIPT_HREF = "/authors-index.js";

const CONTENT_DIR = resolve(process.cwd(), "content");

// Render writes a fixed set of static assets into dist alongside generated pages.
export function listStaticRenderAssets() {
  return [
    {
      sourcePath: resolve(CONTENT_DIR, "favicon.png"),
      outputPath: "favicon.png",
    },
    {
      sourcePath: resolve(CONTENT_DIR, "site.css"),
      outputPath: "site.css",
    },
    {
      sourcePath: resolve(CONTENT_DIR, "feed-country-select.js"),
      outputPath: "feed-country-select.js",
    },
    {
      sourcePath: resolve(CONTENT_DIR, "spaces-index.js"),
      outputPath: "spaces-index.js",
    },
    {
      sourcePath: resolve(CONTENT_DIR, "authors-index.js"),
      outputPath: "authors-index.js",
    },
  ];
}
