import { describe, expect, it } from "vitest";

import { renderAboutPage } from "../src/renderers/renderAboutPage.js";

describe("renderAboutPage", () => {
  it("renders about header, nav, and centered body copy", () => {
    const html = renderAboutPage();

    expect(html).toContain("<title>About</title>");
    expect(html).toContain('<link rel="icon" href="/favicon.png" type="image/png" />');
    expect(html).toContain("<h1>About</h1>");
    expect(html).not.toContain('class="about-link-muted" href="/about/index.html"');
    expect(html).toContain("Data Source");
    expect(html).not.toContain("Source page:");
    expect(html).toContain('href="https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds"');
    expect(html).toContain("wiki.hackerspaces.org");
    expect(html).toContain('href="https://github.com/denikryt/hackerspace-news-rss-feed"');
    expect(html).not.toContain("__DATA_SOURCE_URL__");
    expect(html).not.toContain("__SOURCE_CODE_URL__");
    expect(html).toContain('href="/index.html"');
    expect(html).toContain('href="/feed/index.html"');
    expect(html).toContain(">Feed<");
    expect(html).toContain('href="/authors/index.html"');
    expect(html).toContain("This site aggregates publications");
    expect(html).toContain('class="page-copy page-copy--narrow about-copy"');
  });
});
