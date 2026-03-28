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
          displayDate: "2025-01-01T10:00:00.000Z",
          observed: {
            summaryCandidates: [
              { field: "summary", text: "First line\nSecond line" },
            ],
            contentCandidates: [],
          },
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
    expect(html).toContain('href="/authors/alice.html"');
    expect(html).toContain('href="/authors/bob.html"');
    expect(html).toContain(">Alice<");
    expect(html).toContain(">Bob<");
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
          observed: {
            summaryCandidates: [
              {
                field: "description",
                html: '<p>Hello <a href="https://example.com/post">link</a></p><script>alert(1)</script>',
              },
            ],
            contentCandidates: [],
          },
          authorLinks: [
            { label: "Alice", href: "/authors/alice.html" },
            { label: "Bob", href: "/authors/bob.html" },
          ],
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

  it("keeps short html content as rich html in the global feed", () => {
    const html = renderGlobalFeed({
      items: [
        {
          title: "HTML post",
          spaceName: "BetaMachine",
          spaceHref: "/spaces/betamachine.html",
          link: "https://example.com/post",
          displayDate: "2025-01-01T10:00:00.000Z",
          observed: {
            summaryCandidates: [{ field: "summary", text: "Fallback summary" }],
            contentCandidates: [
              {
                field: "content:encoded",
                html: '<p>Hello <a href="https://example.com/post">link</a></p>',
                text: "Hello link",
              },
            ],
          },
        },
      ],
      homeHref: "/index.html",
      pageTitle: "Feed",
      pageIntro: "All publications sorted from new to old.",
      streamNavItems: [{ href: "/feed/index.html", label: "Feed", isCurrent: true }],
      publicationCountLabel: "1 of 1 publications",
    });

    expect(html).toContain('class="content-body rich-html"');
    expect(html).toContain('<a href="https://example.com/post">link</a>');
    expect(html).not.toContain(">Read more<");
  });

  it("renders truncated long html content as rich html with read more", () => {
    const longHtml = `<p>${"x".repeat(320)}</p><p>${"y".repeat(320)}</p>`;
    const html = renderGlobalFeed({
      items: [
        {
          title: "Long HTML post",
          spaceName: "BetaMachine",
          spaceHref: "/spaces/betamachine.html",
          link: "https://example.com/long-html-post",
          displayDate: "2025-01-01T10:00:00.000Z",
          observed: {
            summaryCandidates: [],
            contentCandidates: [
              {
                field: "content:encoded",
                html: longHtml,
                text: `${"x".repeat(320)} ${"y".repeat(320)}`,
              },
            ],
          },
        },
      ],
      homeHref: "/index.html",
      pageTitle: "Feed",
      pageIntro: "All publications sorted from new to old.",
      streamNavItems: [{ href: "/feed/index.html", label: "Feed", isCurrent: true }],
      publicationCountLabel: "1 of 1 publications",
    });

    expect(html).toContain('class="content-body rich-html"');
    expect(html).toContain(">Read more<");
    expect(html).toContain('href="https://example.com/long-html-post"');
    expect(html).toContain("…");
    expect(html).not.toContain(`${"y".repeat(320)}</p>`);
  });

  it("renders truncated fallback content consistently across renderers", () => {
    const longText = Array.from({ length: 160 }, (_, index) => `content-${index}`).join(" ");
    const feedHtml = renderGlobalFeed({
      items: [
        {
          title: "Long post",
          spaceName: "BetaMachine",
          spaceHref: "/spaces/betamachine.html",
          link: "https://example.com/long-post",
          displayDate: "2025-01-01T10:00:00.000Z",
          observed: {
            summaryCandidates: [],
            contentCandidates: [{ field: "content:encoded", text: longText }],
          },
        },
      ],
      homeHref: "/index.html",
      pageTitle: "Feed",
      pageIntro: "All publications sorted from new to old.",
      streamNavItems: [{ href: "/feed/index.html", label: "Feed", isCurrent: true }],
      publicationCountLabel: "1 of 1 publications",
    });

    const detailHtml = renderSpaceDetail({
      spaceName: "BetaMachine",
      country: "France",
      sourceWikiUrl: "https://wiki.hackerspaces.org/BetaMachine",
      feedUrl: "https://www.betamachine.fr/feed/",
      siteUrl: "https://www.betamachine.fr",
      feedType: "rss",
      status: "parsed_ok",
      items: [
        {
          title: "Long post",
          link: "https://example.com/long-post",
          displayDate: "2025-01-01T10:00:00.000Z",
          observed: {
            summaryCandidates: [],
            contentCandidates: [{ field: "content:encoded", text: longText }],
          },
        },
      ],
      homeHref: "/index.html",
      feedHref: "/feed/index.html",
    });

    const feedMatch = feedHtml.match(/<div class="content-body plain-text">([\s\S]*?)<\/div>/);
    const detailMatch = detailHtml.match(/<div class="content-body plain-text">([\s\S]*?)<\/div>/);
    expect(feedMatch?.[1]).toBeDefined();
    expect(detailMatch?.[1]).toBeDefined();
    expect(feedMatch?.[1]).toBe(detailMatch?.[1]);
    expect(feedMatch?.[1]).toContain("…");
    expect(feedMatch?.[1]?.length).toBeLessThanOrEqual(505); // escaped text may add entities
    expect(feedHtml).not.toContain(longText);
    expect(detailHtml).not.toContain(longText);
    expect(feedHtml).toContain(">Read more<");
    expect(detailHtml).toContain(">Read more<");
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
