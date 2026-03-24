import { describe, expect, it } from "vitest";

import { renderAuthorDetail } from "../src/renderers/renderAuthorDetail.js";
import { renderAuthorsIndex } from "../src/renderers/renderAuthorsIndex.js";

describe("author page rendering", () => {
  it("renders the authors index page", () => {
    const html = renderAuthorsIndex({
      selectedHackerspace: "all",
      authorQuery: "ali",
      sortMode: "alphabetical",
      availableHackerspaces: ["BetaMachine", "C3D2"],
      authors: [
        {
          displayName: "Alice",
          slug: "alice",
          itemCount: 2,
          latestItemDate: "2025-01-02T10:00:00.000Z",
          detailHref: "/authors/alice.html",
          hackerspaces: [
            { name: "BetaMachine", href: "/spaces/betamachine.html" },
            { name: "C3D2", href: "/spaces/c3d2.html" },
          ],
          latestItemDate: "2025-01-02T10:00:00.000Z",
        },
      ],
      visibleAuthors: [],
    });

    expect(html).toContain('<h1 class="home-hero-title">Authors</h1>');
    expect(html).toContain('class="author-card-title" href="/authors/alice.html"');
    expect(html).toContain("2 publications");
    expect(html).toContain('href="/spaces/betamachine.html"');
    expect(html).toContain('href="/spaces/c3d2.html"');
    expect(html).toContain('class="author-hackerspace-link" href="/spaces/betamachine.html"');
    expect(html).toContain(".author-card-title{color:var(--text);display:inline-block;max-inline-size:100%;overflow-wrap:anywhere;word-break:break-word;}");
    expect(html).toContain(".space-card-links .author-hackerspace-link{color:#111;}");
    expect(html).toContain(">BetaMachine<");
    expect(html).toContain(">C3D2<");
    expect(html).toContain('class="about-link-muted" href="/about/index.html"');
    expect(html).toContain('href="/index.html"');
    expect(html).toContain('href="/feed/index.html"');
    expect(html).toContain(">Feed<");
    expect(html).toContain('href="/authors/index.html"');
    expect(html).toContain("Hackerspace");
    expect(html).toContain("Search authors");
    expect(html).toContain('id="author-search-input"');
    expect(html).toContain('value="ali"');
    expect(html).toContain("All hackerspaces");
    expect(html).toContain("Sort authors");
    expect(html).toContain("Publication count");
    expect(html).toContain("Latest publication");
    expect(html).toContain("localStorage");
    expect(html).toContain("hackerspace-news-feed.authors.query");
    expect(html).toContain("hackerspace-news-feed.authors.hackerspace");
    expect(html).toContain("hackerspace-news-feed.authors.sortMode");
    expect(html).toContain('data-hackerspaces="BetaMachine|C3D2"');
    expect(html).toContain('data-publication-count="2"');
    expect(html).toContain('data-latest-item-date="2025-01-02T10:00:00.000Z"');
    expect(html).toContain("No authors match the selected hackerspace.");
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
      feedHref: "/feed/index.html",
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
    expect(html).toContain('class="about-link-muted" href="/about/index.html"');
    expect(html).toContain('href="/authors/index.html"');
    expect(html).toContain("1 of 41 publications");
    expect(html).toContain("/authors/alice/page/3/");
  });
});
