import { resolve } from "node:path";

export const SOURCE_PAGE_URL =
  "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds";

export const DATA_DIR = resolve(process.cwd(), "data");
export const DIST_DIR = resolve(process.cwd(), "dist");

export const PATHS = {
  sourceRows: resolve(DATA_DIR, "source_urls.json"),
  validations: resolve(DATA_DIR, "feed_validation.json"),
  normalizedFeeds: resolve(DATA_DIR, "feeds_normalized.json"),
  htmlOutput: resolve(DIST_DIR, "index.html"),
};
