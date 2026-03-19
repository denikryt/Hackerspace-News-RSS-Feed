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
    expect(html).toContain('class="item-inner"');
    expect(html).toContain("First line\nSecond line");
    expect(html).toContain(".item-inner {");
    expect(html).toContain("max-inline-size: 72ch");
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
});
