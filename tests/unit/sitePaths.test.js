import { describe, expect, it } from "vitest";

import {
  getAboutHref,
  getAuthorsIndexHref,
  getCuratedHref,
  getHomeHref,
  getNewsIndexHref,
} from "../../src/sitePaths.js";

describe("sitePaths", () => {
  it("returns canonical slash-based hrefs for shared site navigation", () => {
    expect(getHomeHref()).toBe("/");
    expect(getAboutHref()).toBe("/about/");
    expect(getAuthorsIndexHref()).toBe("/authors/");
    expect(getCuratedHref()).toBe("/curated/");
    expect(getNewsIndexHref()).toBe("/news/");
  });
});
