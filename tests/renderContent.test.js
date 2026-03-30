import { describe, expect, it } from "vitest";

import { renderGlobalFeed } from "../src/renderers/renderGlobalFeed.js";
import { renderSpaceDetail } from "../src/renderers/renderSpaceDetail.js";

describe("content rendering", () => {
  it("renders plain text content with preserved line breaks", () => {
    const html = renderGlobalFeed({
      items: [
        {
          title: "Plain post",
          spaceName: "BetaMachine",
          spaceHref: "/spaces/betamachine.html",
          link: "https://example.com/plain-post",
          displayDate: "2025-01-01T10:00:00.000Z",
          summaryText: "First line\nSecond line",
          authorLinks: [
            { label: "Alice", href: "/authors/alice.html" },
            { label: "Bob", href: "/authors/bob.html" },
          ],
        },
      ],
      homeHref: "/index.html",
      pageTitle: "Feed",
      pageIntro: "All publications sorted from new to old.",
      streamNavItems: [{ href: "/feed/index.html", label: "Feed", isCurrent: true }],
      publicationCountLabel: "1 of 1 publications",
    });

    expect(html).toContain('class="content-body plain-text"');
    expect(html).toContain('class="timeline-entry"');
    expect(html).toContain('class="timeline-date"');
    expect(html).toContain('class="timeline-content"');
    expect(html).toContain('class="timeline-date-label">JAN');
    expect(html).toContain('class="timeline-date-day">01');
    expect(html).toContain('class="timeline-date-year">2025');
    expect(html).toContain("First line\nSecond line");
    expect(html).toContain('href="/spaces/betamachine.html"');
    expect(html).toContain(">Source<");
    expect(html).toContain("•");
    expect(html).toContain("Authors:");
    expect(html).toContain('Authors:&nbsp;</span><a');
    expect(html).toContain('href="/authors/alice.html"');
    expect(html).toContain('href="/authors/bob.html"');
    expect(html).toContain('class="global-feed-meta-line global-feed-meta-line-primary"');
    expect(html).toContain('class="global-feed-meta-line global-feed-meta-line-authors"');
    expect(html).toContain(".global-feed-meta { display: grid !important;");
    expect(html).toContain(".timeline-entry {");
    expect(html).toContain("grid-template-columns: 7rem 1rem minmax(0, 1fr)");
    expect(html).toContain("overflow-wrap: anywhere");
  });

  it("renders sanitized html content and attachment links on detail pages", () => {
    const html = renderSpaceDetail({
      spaceName: "BetaMachine",
      country: "France",
      sourceWikiUrl: "https://wiki.hackerspaces.org/BetaMachine",
      feedUrl: "https://www.betamachine.fr/feed/",
      siteUrl: "https://www.betamachine.fr",
      feedType: "rss",
      status: "parsed_ok",
      errorCode: undefined,
      items: [
        {
          title: "HTML post",
          displayDate: "2025-01-01T10:00:00.000Z",
          authorLinks: [
            { label: "Alice", href: "/authors/alice.html" },
            { label: "Bob", href: "/authors/bob.html" },
          ],
          contentHtml:
            '<p>Hello <a href="https://example.com/post">link</a></p><script>alert(1)</script>',
          normalizedCategories: ["event", "news"],
          attachments: [
            {
              url: "https://example.com/audio.mp3",
              type: "audio/mpeg",
            },
          ],
        },
      ],
      homeHref: "/index.html",
      feedHref: "/feed/index.html",
    });

    expect(html).toContain('<a href="https://example.com/post">link</a>');
    expect(html).toContain("https://example.com/audio.mp3");
    expect(html).toContain('href="/authors/alice.html"');
    expect(html).toContain('href="/authors/bob.html"');
    expect(html).toContain("event, news");
    expect(html).not.toContain("<script");
    expect(html).toContain("max-inline-size: min(100%, 42rem)");
    expect(html).toContain('img[src*="emoji"]');
  });

  it("renders detail page source above author links and omits the author line when absent", () => {
    const html = renderSpaceDetail({
      spaceName: "BetaMachine",
      items: [
        {
          title: "Post with author",
          displayDate: "2025-01-01T10:00:00.000Z",
          link: "https://example.com/post-with-author",
          authorLinks: [{ label: "Alice", href: "/authors/alice.html" }],
        },
        {
          title: "Post without author",
          displayDate: "2025-01-02T10:00:00.000Z",
          link: "https://example.com/post-without-author",
          authorLinks: [],
        },
      ],
      homeHref: "/index.html",
      feedHref: "/feed/index.html",
    });

    expect(html).toContain('href="https://example.com/post-with-author">Source</a>');
    expect(html).toContain('href="/authors/alice.html"');
    expect(html).toContain('class="global-feed-meta-line global-feed-meta-line-primary"');
    expect(html).toContain('class="global-feed-meta-line global-feed-meta-line-authors"');
    expect(html).toContain("Source</a></span></span><span class=\"global-feed-meta-line global-feed-meta-line-authors\"");
    expect(html).toContain('href="https://example.com/post-without-author">Source</a>');
    expect(html).not.toContain("Original");
    expect(html.match(/Author:/g) || []).toHaveLength(1);
  });

  it("renders pagination controls for global feed", () => {
    const html = renderGlobalFeed({
      items: [
        {
          title: "Paginated post",
          spaceName: "BetaMachine",
          spaceHref: "/spaces/betamachine.html",
          displayDate: "2025-01-01T10:00:00.000Z",
        },
      ],
      homeHref: "/index.html",
      currentPage: 2,
      totalPages: 5,
      currentPageLabel: "Page 2 of 5",
      hasPreviousPage: true,
      hasNextPage: true,
      previousPageHref: "/feed/index.html",
      nextPageHref: "/feed/page/3/",
      pageLinks: [
        { type: "page", page: 1, href: "/feed/index.html", isCurrent: false },
        { type: "page", page: 2, href: "/feed/page/2/", isCurrent: true },
        { type: "page", page: 3, href: "/feed/page/3/", isCurrent: false },
        { type: "ellipsis" },
        { type: "page", page: 5, href: "/feed/page/5/", isCurrent: false },
      ],
      pageTitle: "Feed",
      pageIntro: "All publications sorted from new to old.",
      streamNavItems: [{ href: "/feed/index.html", label: "Feed", isCurrent: true }],
      publicationCountLabel: "1 of 42 publications",
    });

    expect(html).toContain("Page 2 of 5");
    expect(html).toContain("1 of 42 publications");
    expect(html).toContain(">Previous<");
    expect(html).toContain(">Next<");
    expect(html).toContain('class="pagination-link current"');
    expect(html).toContain("/feed/page/3/");
    expect(html).toContain('class="timeline-date-label"');
  });

  it("renders pagination controls for space detail pages", () => {
    const html = renderSpaceDetail({
      spaceName: "BetaMachine",
      country: "France",
      sourceWikiUrl: "https://wiki.hackerspaces.org/BetaMachine",
      feedUrl: "https://www.betamachine.fr/feed/",
      siteUrl: "https://www.betamachine.fr",
      feedType: "rss",
      status: "parsed_ok",
      items: [
        {
          title: "Detail page post",
          displayDate: "2025-01-01T10:00:00.000Z",
        },
      ],
      currentPage: 2,
      totalPages: 5,
      currentPageLabel: "Page 2 of 5",
      hasPreviousPage: true,
      hasNextPage: true,
      previousPageHref: "/spaces/betamachine.html",
      nextPageHref: "/spaces/betamachine/page/3/",
      pageLinks: [
        { type: "page", page: 1, href: "/spaces/betamachine.html", isCurrent: false },
        { type: "page", page: 2, href: "/spaces/betamachine/page/2/", isCurrent: true },
        { type: "page", page: 3, href: "/spaces/betamachine/page/3/", isCurrent: false },
        { type: "ellipsis" },
        { type: "page", page: 5, href: "/spaces/betamachine/page/5/", isCurrent: false },
      ],
      homeHref: "/index.html",
      feedHref: "/feed/index.html",
      publicationCountLabel: "1 of 41 publications",
    });

    expect(html).toContain("Page 2 of 5");
    expect(html).toContain("1 of 41 publications");
    expect(html).toContain("/spaces/betamachine/page/3/");
    expect(html).toContain('class="pagination-link current"');
    expect(html).toContain('class="timeline-entry timeline-entry-detail"');
    expect(html).toContain('class="timeline-date"');
  });
});
