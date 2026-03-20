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
          publishedAt: "2025-01-01T10:00:00.000Z",
          contentText: "First line\nSecond line",
        },
      ],
      homeHref: "/index.html",
    });

    expect(html).toContain('class="content-body plain-text"');
    expect(html).toContain('class="timeline-entry"');
    expect(html).toContain('class="timeline-date"');
    expect(html).toContain('class="timeline-content"');
    expect(html).toContain('class="timeline-date-label">JAN');
    expect(html).toContain('class="timeline-date-day">01');
    expect(html).toContain('class="timeline-date-year">2025');
    expect(html).toContain("First line\nSecond line");
    expect(html).toContain(".timeline-entry {");
    expect(html).toContain("grid-template-columns: 7rem minmax(0, 1fr)");
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
          publishedAt: "2025-01-01T10:00:00.000Z",
          contentHtml:
            '<p>Hello <a href="https://example.com/post">link</a></p><script>alert(1)</script>',
          attachments: [
            {
              url: "https://example.com/audio.mp3",
              type: "audio/mpeg",
            },
          ],
        },
      ],
      homeHref: "/index.html",
      globalFeedHref: "/feed/index.html",
    });

    expect(html).toContain('<a href="https://example.com/post">link</a>');
    expect(html).toContain("https://example.com/audio.mp3");
    expect(html).not.toContain("<script");
    expect(html).toContain("max-inline-size: min(100%, 42rem)");
    expect(html).toContain('img[src*="emoji"]');
  });

  it("renders pagination controls for global feed", () => {
    const html = renderGlobalFeed({
      items: [
        {
          title: "Paginated post",
          spaceName: "BetaMachine",
          spaceHref: "/spaces/betamachine.html",
          publishedAt: "2025-01-01T10:00:00.000Z",
        },
      ],
      homeHref: "/index.html",
      currentPage: 2,
      totalPages: 5,
      currentPageLabel: "Page 2 of 5",
      hasPreviousPage: true,
      hasNextPage: true,
      previousPageHref: "/feed/",
      nextPageHref: "/feed/page/3/",
      pageLinks: [
        { type: "page", page: 1, href: "/feed/", isCurrent: false },
        { type: "page", page: 2, href: "/feed/page/2/", isCurrent: true },
        { type: "page", page: 3, href: "/feed/page/3/", isCurrent: false },
        { type: "ellipsis" },
        { type: "page", page: 5, href: "/feed/page/5/", isCurrent: false },
      ],
    });

    expect(html).toContain("Page 2 of 5");
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
          publishedAt: "2025-01-01T10:00:00.000Z",
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
      globalFeedHref: "/feed/",
    });

    expect(html).toContain("Page 2 of 5");
    expect(html).toContain("/spaces/betamachine/page/3/");
    expect(html).toContain('class="pagination-link current"');
    expect(html).toContain('class="timeline-entry"');
    expect(html).toContain('class="timeline-date"');
  });
});
