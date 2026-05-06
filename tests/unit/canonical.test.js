import { describe, expect, it } from "vitest";

import { pagePathToCanonicalUrl } from "../../src/canonical.js";

const SITE_URL = "https://hackerspace.news";

describe("pagePathToCanonicalUrl", () => {
  it("converts the root index.html path to the site root URL", () => {
    expect(pagePathToCanonicalUrl("index.html", SITE_URL)).toBe("https://hackerspace.news/");
  });

  it("converts nested index.html pages to trailing-slash canonical URLs", () => {
    expect(pagePathToCanonicalUrl("authors/index.html", SITE_URL)).toBe(
      "https://hackerspace.news/authors/",
    );
    expect(pagePathToCanonicalUrl("news/2026-04-20/index.html", SITE_URL)).toBe(
      "https://hackerspace.news/news/2026-04-20/",
    );
  });

  it("converts direct html files to canonical URLs without changing the filename", () => {
    expect(pagePathToCanonicalUrl("spaces/noisebridge.html", SITE_URL)).toBe(
      "https://hackerspace.news/spaces/noisebridge.html",
    );
  });

  it("returns null for redirect-only and non-html paths", () => {
    expect(pagePathToCanonicalUrl("news/index.html", SITE_URL)).toBeNull();
    expect(pagePathToCanonicalUrl("robots.txt", SITE_URL)).toBeNull();
    expect(pagePathToCanonicalUrl("news/dates.json", SITE_URL)).toBeNull();
  });
});
