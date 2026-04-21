import { describe, expect, it } from "vitest";
import { buildRobotsTxt, buildSitemapXml, pagePathToUrl } from "../../src/sitemap.js";

const SITE_URL = "https://hackerspace.news";

describe("pagePathToUrl", () => {
  it("converts news date index to trailing slash URL", () => {
    expect(pagePathToUrl("news/2026-04-20/index.html", SITE_URL)).toBe(
      "https://hackerspace.news/news/2026-04-20/",
    );
  });

  it("converts root index.html to site root URL", () => {
    expect(pagePathToUrl("index.html", SITE_URL)).toBe("https://hackerspace.news/");
  });

  it("converts spaces HTML to absolute URL", () => {
    expect(pagePathToUrl("spaces/noisebridge.html", SITE_URL)).toBe(
      "https://hackerspace.news/spaces/noisebridge.html",
    );
  });

  it("converts authors HTML to absolute URL", () => {
    expect(pagePathToUrl("authors/alice.html", SITE_URL)).toBe(
      "https://hackerspace.news/authors/alice.html",
    );
  });

  it("converts about/index.html to trailing slash URL", () => {
    expect(pagePathToUrl("about/index.html", SITE_URL)).toBe("https://hackerspace.news/about/");
  });

  it("converts paginated author path to trailing slash URL", () => {
    expect(pagePathToUrl("authors/alice/page/2/index.html", SITE_URL)).toBe(
      "https://hackerspace.news/authors/alice/page/2/",
    );
  });

  it("converts country sub-page to trailing slash URL", () => {
    expect(pagePathToUrl("news/2026-04-20/ukraine/index.html", SITE_URL)).toBe(
      "https://hackerspace.news/news/2026-04-20/ukraine/",
    );
  });

  it("returns null for news/index.html (redirect, not canonical)", () => {
    expect(pagePathToUrl("news/index.html", SITE_URL)).toBeNull();
  });

  it("returns null for authors/index.html (index, not canonical content page)", () => {
    expect(pagePathToUrl("authors/index.html", SITE_URL)).toBeNull();
  });

  it("returns null for news/dates.json (not HTML)", () => {
    expect(pagePathToUrl("news/dates.json", SITE_URL)).toBeNull();
  });

  it("returns null for sitemap.xml itself", () => {
    expect(pagePathToUrl("sitemap.xml", SITE_URL)).toBeNull();
  });

  it("returns null for robots.txt itself", () => {
    expect(pagePathToUrl("robots.txt", SITE_URL)).toBeNull();
  });
});

describe("buildSitemapXml", () => {
  it("returns valid XML declaration", () => {
    const xml = buildSitemapXml([], SITE_URL);
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  it("contains urlset with correct namespace", () => {
    const xml = buildSitemapXml([], SITE_URL);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  });

  it("empty input produces valid empty urlset", () => {
    const xml = buildSitemapXml([], SITE_URL);
    expect(xml).toContain("<urlset");
    expect(xml).toContain("</urlset>");
    expect(xml).not.toContain("<url>");
  });

  it("includes loc for a news date page", () => {
    const xml = buildSitemapXml(["news/2026-04-20/index.html"], SITE_URL);
    expect(xml).toContain("<loc>https://hackerspace.news/news/2026-04-20/</loc>");
  });

  it("includes loc for a spaces page", () => {
    const xml = buildSitemapXml(["spaces/noisebridge.html"], SITE_URL);
    expect(xml).toContain("<loc>https://hackerspace.news/spaces/noisebridge.html</loc>");
  });

  it("excludes news/index.html", () => {
    const xml = buildSitemapXml(["news/index.html", "news/2026-04-20/index.html"], SITE_URL);
    expect(xml).not.toContain("news/index.html");
    expect(xml).toContain("news/2026-04-20/");
  });

  it("excludes news/dates.json", () => {
    const xml = buildSitemapXml(["news/dates.json", "news/2026-04-20/index.html"], SITE_URL);
    expect(xml).not.toContain("dates.json");
  });

  it("includes multiple pages", () => {
    const xml = buildSitemapXml(
      ["news/2026-04-20/index.html", "spaces/noisebridge.html", "authors/alice.html"],
      SITE_URL,
    );
    expect(xml).toContain("news/2026-04-20/");
    expect(xml).toContain("spaces/noisebridge.html");
    expect(xml).toContain("authors/alice.html");
  });
});

describe("buildRobotsTxt", () => {
  it("contains User-agent directive", () => {
    expect(buildRobotsTxt(SITE_URL)).toContain("User-agent: *");
  });

  it("contains Allow directive", () => {
    expect(buildRobotsTxt(SITE_URL)).toContain("Allow: /");
  });

  it("contains Sitemap directive pointing to sitemap.xml", () => {
    expect(buildRobotsTxt(SITE_URL)).toContain(
      "Sitemap: https://hackerspace.news/sitemap.xml",
    );
  });

  it("Sitemap line reflects provided siteUrl", () => {
    expect(buildRobotsTxt("https://example.com")).toContain(
      "Sitemap: https://example.com/sitemap.xml",
    );
  });
});
