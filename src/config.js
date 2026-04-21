import { resolve } from "node:path";

export const SITE_URL = "https://hackerspace.news";

export const SOURCE_PAGE_URL =
  "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds";
export const WEBSITE_DISCOVERY_SOURCE_PAGE_URL =
  "https://wiki.hackerspaces.org/List_of_Hacker_Spaces";

export const DATA_DIR = resolve(process.cwd(), "data");
export const CONTENT_DIR = resolve(process.cwd(), "content");
export const DIST_DIR = resolve(process.cwd(), "dist");

export const PATHS = {
  curatedPublications: resolve(CONTENT_DIR, "curated_publications.yml"),
  sourceRows: resolve(DATA_DIR, "source_urls.json"),
  validations: resolve(DATA_DIR, "feed_validation.json"),
  normalizedFeeds: resolve(DATA_DIR, "feeds_normalized.json"),
  curatedNormalized: resolve(DATA_DIR, "curated_publications_normalized.json"),
  discoveredValidSourceRows: resolve(CONTENT_DIR, "discovered_valid_source_urls.json"),
  discoveredHackerspaceSourceSnapshot: resolve(DATA_DIR, "discovery/list_of_hacker_spaces.html"),
  discoveredHackerspaceFeeds: resolve(DATA_DIR, "discovery/discovered_hackerspace_feeds.json"),
  htmlOutput: resolve(DIST_DIR, "index.html"),
};
