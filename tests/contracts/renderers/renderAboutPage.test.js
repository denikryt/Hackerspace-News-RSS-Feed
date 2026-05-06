import { describe, expect, it } from "vitest";

import { renderAboutPage } from "../../../src/renderers/renderAboutPage.js";

describe("renderAboutPage", () => {
  it("renders about header, nav, and centered body copy", () => {
    const html = renderAboutPage();

    expect(html).toContain("<title>About</title>");
    expect(html).toContain('<link rel="icon" href="/favicon.png" type="image/png" />');
    expect(html).toContain('<link rel="stylesheet" href="/site.css" />');
    expect(html).toContain("<h1>About</h1>");
    expect(html).not.toContain('class="about-link-muted" href="/about/"');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/news/"');
    expect(html).toContain(">News<");
    expect(html).toContain('href="/authors/"');
    expect(html).toContain('class="page-copy page-copy--narrow about-copy"');
    expect(html).toContain("<strong>Data Sources:</strong>");
    expect(html).toContain("Made with passion by");
  });
});
