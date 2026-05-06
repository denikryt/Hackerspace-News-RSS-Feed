import { describe, expect, it } from "vitest";

import { renderGlobalFeed } from "../../../src/renderers/renderGlobalFeed.js";
import { renderSpaceDetail } from "../../../src/renderers/renderSpaceDetail.js";

describe("feed page headers", () => {
  it("renders the content stream header shell and nav", () => {
    const html = renderGlobalFeed({
      items: [],
      homeHref: "/",
      pageTitle: "Events",
      pageIntro: "Items tagged as events.",
      currentPageLabel: "Page 1 of 1",
      streamNavItems: [
        { href: "/news/", label: "Feed", isCurrent: false },
        { href: "/curated/", label: "Curated", isCurrent: false },
        { href: "/authors/", label: "Authors", isCurrent: false },
        { href: "/events/index.html", label: "Events", isCurrent: true },
        { href: "/other/index.html", label: "Other", isCurrent: false },
      ],
    });

    expect(html).toContain('class="panel page-header page-header--narrow page-header--compact"');
    expect(html).toContain("<h1>Events</h1>");
    expect(html).toContain("Items tagged as events.");
    expect(html).toContain('class="about-link-muted" href="/about/"');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/news/"');
    expect(html).toContain('href="/curated/"');
    expect(html).toContain('href="/authors/"');
    expect(html).toContain('href="/events/index.html"');
  });

  it("renders the space detail header shell and nav", () => {
    const html = renderSpaceDetail({
      spaceName: "Technik.cafe",
      country: "Germany",
      sourceWikiUrl: "https://wiki.hackerspaces.org/Technik.cafe",
      siteUrl: "https://technik.cafe",
      homeHref: "/",
      feedHref: "/news/",
      authorsIndexHref: "/authors/",
      currentPageLabel: "Page 1 of 1",
      items: [],
    });

    expect(html).toContain('class="panel page-header page-header--narrow page-header--compact"');
    expect(html).toContain("<h1>Technik.cafe</h1>");
    expect(html).toContain("Country:");
    expect(html).toContain('class="about-link-muted" href="/about/"');
    expect(html).toContain(">Wiki<");
    expect(html).toContain(">Website<");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/news/"');
    expect(html).toContain('href="/curated/"');
    expect(html).toContain('href="/authors/"');
  });

  it("renders prepared display content and does not rebuild it from raw item fields", () => {
    const feedHtml = renderGlobalFeed({
      items: [
        {
          title: "Prepared item",
          summaryText: "This raw summary must stay unused",
          displayContent: {
            renderMode: "text",
            text: "Prepared display summary",
            attachments: [],
          },
        },
        {
          title: "Missing prepared display",
          summaryText: "This raw summary must not render",
        },
      ],
      homeHref: "/",
      currentPageLabel: "Page 1 of 1",
      streamNavItems: [{ href: "/news/", label: "Feed", isCurrent: true }],
    });

    const detailHtml = renderSpaceDetail({
      spaceName: "Technik.cafe",
      homeHref: "/",
      feedHref: "/news/",
      authorsIndexHref: "/authors/",
      currentPageLabel: "Page 1 of 1",
      items: [
        {
          title: "Prepared detail item",
          summaryText: "This raw detail summary must stay unused",
          displayContent: {
            renderMode: "text",
            text: "Prepared detail summary",
            attachments: [],
          },
        },
        {
          title: "Missing prepared detail display",
          summaryText: "This raw detail summary must not render",
        },
      ],
    });

    expect(feedHtml).toContain("Prepared display summary");
    expect(feedHtml).not.toContain("This raw summary must stay unused");
    expect(feedHtml).not.toContain("This raw summary must not render");
    expect(detailHtml).toContain("Prepared detail summary");
    expect(detailHtml).not.toContain("This raw detail summary must stay unused");
    expect(detailHtml).not.toContain("This raw detail summary must not render");
  });
});
