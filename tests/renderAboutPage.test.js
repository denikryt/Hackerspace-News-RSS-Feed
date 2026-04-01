import { describe, expect, it } from "vitest";

import { renderAboutPage } from "../src/renderers/renderAboutPage.js";

describe("renderAboutPage", () => {
  it("renders about header, nav, and centered body copy", () => {
    const html = renderAboutPage();

    expect(html).toContain("<title>About</title>");
    expect(html).toContain('<link rel="icon" href="/favicon.png" type="image/png" />');
    expect(html).toContain("<h1>About</h1>");
    expect(html).not.toContain('class="about-link-muted" href="/about/index.html"');
    expect(html).toContain('href="/index.html"');
    expect(html).toContain('href="/feed/index.html"');
    expect(html).toContain(">Feed<");
    expect(html).toContain('href="/curated/index.html"');
    expect(html).toContain(">Curated<");
    expect(html).toContain('href="/authors/index.html"');
    expect(html).toContain('class="page-copy page-copy--narrow about-copy"');
  });
});
