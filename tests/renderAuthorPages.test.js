import { describe, expect, it } from "vitest";

import { renderAuthorDetail } from "../src/renderers/renderAuthorDetail.js";
import { renderAuthorsIndex } from "../src/renderers/renderAuthorsIndex.js";

describe("author page rendering", () => {
  it("renders the authors index page", () => {
    const html = renderAuthorsIndex({
      authors: [
        {
          displayName: "Alice",
          slug: "alice",
          itemCount: 2,
          latestItemDate: "2025-01-02T10:00:00.000Z",
          detailHref: "/authors/alice.html",
        },
      ],
    });

    expect(html).toContain('<h1 class="home-hero-title">Authors</h1>');
    expect(html).toContain('href="/authors/alice.html"');
    expect(html).toContain("2 publications");
    expect(html).toContain('href="/index.html"');
    expect(html).toContain('href="/all/index.html"');
    expect(html).toContain('href="/authors/index.html"');
    expect(html).toContain('class="panel page-header page-header--wide page-header--compact"');
    expect(html).toContain('class="page-nav page-nav--wide page-nav--compact"');
    expect(html).toContain('class="panel page-summary page-summary--home"');
    expect(html).not.toContain('class="panel page-summary page-summary--home page-shell-narrow"');
    expect(html).not.toContain('class="panel page-header page-header--narrow page-header--compact"');
  });

  it("renders the author detail page with pagination", () => {
    const html = renderAuthorDetail({
      authorDisplayName: "Alice",
      items: [
        {
          title: "Alice post",
          spaceName: "BetaMachine",
          spaceHref: "/spaces/betamachine.html",
          displayDate: "2025-01-02T10:00:00.000Z",
        },
      ],
      homeHref: "/index.html",
      allContentHref: "/all/index.html",
      authorsIndexHref: "/authors/index.html",
      currentPageLabel: "Page 2 of 5",
      publicationCountLabel: "1 of 41 publications",
      hasPreviousPage: true,
      hasNextPage: true,
      previousPageHref: "/authors/alice.html",
      nextPageHref: "/authors/alice/page/3/",
      pageLinks: [
        { type: "page", page: 1, href: "/authors/alice.html", isCurrent: false },
        { type: "page", page: 2, href: "/authors/alice/page/2/", isCurrent: true },
        { type: "page", page: 3, href: "/authors/alice/page/3/", isCurrent: false },
      ],
    });

    expect(html).toContain("<h1>Alice</h1>");
    expect(html).toContain('href="/authors/index.html"');
    expect(html).toContain("1 of 41 publications");
    expect(html).toContain("/authors/alice/page/3/");
  });
});
