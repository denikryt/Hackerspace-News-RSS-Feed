import { describe, expect, it } from "vitest";

import { renderPageHeader } from "../../src/renderers/layout.js";

describe("renderPageHeader", () => {
  it("renders a shared header shell with optional intro and nav", () => {
    const html = renderPageHeader({
      title: "About",
      headerClass: "page-header--narrow page-header--compact",
      introHtml: '<p class="muted">Intro copy</p>',
      navClass: "page-nav--narrow",
      navItems: [
        { href: "/index.html", label: "Hackerspaces" },
        { href: "/feed/index.html", label: "Global Feed", isCurrent: true },
      ],
    });

    expect(html).toContain('class="panel page-header page-header--narrow page-header--compact"');
    expect(html).toContain("<h1>About</h1>");
    expect(html).toContain("Intro copy");
    expect(html).toContain('class="page-nav page-nav--narrow"');
    expect(html).toContain('href="/feed/index.html"');
    expect(html).toContain('aria-current="page"');
  });

  it("omits optional intro and nav wrapper cleanly when not provided", () => {
    const html = renderPageHeader({
      title: "Only Title",
    });

    expect(html).toContain('<section class="panel page-header">');
    expect(html).toContain("<h1>Only Title</h1>");
    expect(html).not.toContain("section-nav");
    expect(html).not.toContain("undefined");
  });
});
