import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ABOUT_HTML_PATH = resolve(process.cwd(), "content/about.html");

// The about page is one of the few intentional raw-HTML boundaries in the
// render path, so we keep file loading explicit in one helper.
export function loadAboutHtmlBoundary() {
  return readFileSync(ABOUT_HTML_PATH, "utf8");
}
