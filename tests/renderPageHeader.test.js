import { describe, expect, it } from "vitest";

import { renderPageHeader } from "../src/renderers/layout.js";

describe("renderPageHeader", () => {
  it("renders a shared header shell with optional intro and nav", () => {
    const html = renderPageHeader({
      title: "About",
      shellClass: "page-shell-narrow page-masthead-compact",
      introHtml: '<p class="muted">Intro copy</p>',
      navWrapperClass: "page-shell-narrow",
      navItems: [
        { href: "/index.html", label: "Hackerspaces" },
        { href: "/feed/index.html", label: "Global Feed", isCurrent: true },
      ],
    });

    expect(html).toContain('class="panel page-shell-narrow page-masthead-compact"');
    expect(html).toContain("<h1>About</h1>");
    expect(html).toContain("Intro copy");
    expect(html).toContain('class="page-shell-narrow"');
    expect(html).toContain('href="/feed/index.html"');
    expect(html).toContain('aria-current="page"');
  });

  it("omits optional intro and nav wrapper cleanly when not provided", () => {
    const html = renderPageHeader({
      title: "Only Title",
    });

    expect(html).toContain('<section class="panel">');
    expect(html).toContain("<h1>Only Title</h1>");
    expect(html).not.toContain("section-nav");
    expect(html).not.toContain("undefined");
  });
});
