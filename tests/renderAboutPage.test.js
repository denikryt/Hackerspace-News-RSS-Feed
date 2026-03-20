import { describe, expect, it } from "vitest";

import { renderAboutPage } from "../src/renderers/renderAboutPage.js";

describe("renderAboutPage", () => {
  it("renders about header, nav, and centered body copy", () => {
    const html = renderAboutPage();

    expect(html).toContain("<title>About</title>");
    expect(html).toContain("<h1>About</h1>");
    expect(html).toContain('href="/index.html"');
    expect(html).toContain('href="/feed/index.html"');
    expect(html).toContain("This site aggregates publications");
    expect(html).toContain('class="page-shell-narrow about-copy"');
  });
});
