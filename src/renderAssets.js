import { resolve } from "node:path";

// Shared asset hrefs stay explicit so renderers and renderSite use one contract.
export const SITE_CSS_HREF = "/site.css";
export const NEWSPAPER_CSS_HREF = "/static/newspaper.css";
export const NEWSPAPER_NAV_SCRIPT_HREF = "/newspaper-nav.js";
export const SPACES_INDEX_SCRIPT_HREF = "/spaces-index.js";
export const AUTHORS_INDEX_SCRIPT_HREF = "/authors-index.js";

const STATIC_DIR = resolve(process.cwd(), "static");

// Render writes a fixed set of static assets into dist alongside generated pages.
// These are repository-managed frontend assets, not raw content artifacts.
export function listStaticRenderAssets() {
  return [
    {
      sourcePath: resolve(STATIC_DIR, "favicon.png"),
      outputPath: "favicon.png",
    },
    {
      sourcePath: resolve(STATIC_DIR, "site.css"),
      outputPath: "site.css",
    },
    {
      sourcePath: resolve(STATIC_DIR, "spaces-index.js"),
      outputPath: "spaces-index.js",
    },
    {
      sourcePath: resolve(STATIC_DIR, "authors-index.js"),
      outputPath: "authors-index.js",
    },
    {
      sourcePath: resolve(STATIC_DIR, "newspaper.css"),
      outputPath: "static/newspaper.css",
    },
    {
      sourcePath: resolve(STATIC_DIR, "newspaper-nav.js"),
      outputPath: "newspaper-nav.js",
    },
  ];
}
