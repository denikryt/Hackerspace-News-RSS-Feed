import { describe, expect, it } from "vitest";

import { renderGlobalFeed } from "../src/renderers/renderGlobalFeed.js";
import { renderSpaceDetail } from "../src/renderers/renderSpaceDetail.js";

describe("feed page headers", () => {
  it("renders the content stream header shell and nav", () => {
    const html = renderGlobalFeed({
      items: [],
      homeHref: "/index.html",
      pageTitle: "Events",
      pageIntro: "Items tagged as events.",
      currentPageLabel: "Page 1 of 1",
      streamNavItems: [
        { href: "/feed/index.html", label: "Feed", isCurrent: false },
        { href: "/curated/index.html", label: "Curated", isCurrent: false },
        { href: "/authors/index.html", label: "Authors", isCurrent: false },
        { href: "/events/index.html", label: "Events", isCurrent: true },
        { href: "/other/index.html", label: "Other", isCurrent: false },
      ],
    });

    expect(html).toContain('class="panel page-header page-header--narrow page-header--compact"');
    expect(html).toContain("<h1>Events</h1>");
    expect(html).toContain("Items tagged as events.");
    expect(html).toContain('class="about-link-muted" href="/about/index.html"');
    expect(html).toContain('href="/index.html"');
    expect(html).toContain('href="/feed/index.html"');
    expect(html).toContain('href="/curated/index.html"');
    expect(html).toContain('href="/authors/index.html"');
    expect(html).toContain('href="/events/index.html"');
  });

  it("renders a country select control below the section nav on feed pages", () => {
    const html = renderGlobalFeed({
      items: [],
      homeHref: "/index.html",
      pageTitle: "Feed",
      pageIntro: "All publications sorted from new to old.",
      currentPageLabel: "Page 1 of 1",
      streamNavItems: [
        { href: "/feed/index.html", label: "Feed", isCurrent: true },
        { href: "/authors/index.html", label: "Authors", isCurrent: false },
      ],
      countryOptions: [
        { label: "All countries", href: "/feed/index.html", isSelected: false },
        { label: "France", href: "/feed/countries/france/index.html", isSelected: true },
      ],
    });

    expect(html).toContain('class="feed-controls-shell page-shell-narrow"');
    expect(html).toContain('class="feed-controls feed-controls-country"');
    expect(html).toContain('class="feed-control feed-control-country"');
    expect(html).toContain('class="control-select control-select-country"');
    expect(html).toContain('id="feed-country-select"');
    expect(html).toContain('aria-label="Choose feed country"');
    expect(html).toContain('value="/feed/countries/france/index.html" selected');
    expect(html).toContain("window.location.href");
    expect(html).toContain(".feed-controls-shell{margin:0 auto 18px;}");
    expect(html).toContain(".feed-control-country .control-select{inline-size:min(100%, 16rem);}");
    expect(html).toContain("@media (max-width: 720px){.feed-control-country .control-select{inline-size:100%;}}");
    expect(html).not.toContain('class="panel page-shell-narrow"><div class="feed-controls feed-controls-country"');
    expect(html.indexOf('class="page-nav page-nav--narrow"')).toBeLessThan(
      html.indexOf('class="feed-controls feed-controls-country"'),
    );
    expect(html.indexOf('class="feed-controls feed-controls-country"')).toBeLessThan(
      html.indexOf('class="feed-list-shell page-shell-narrow timeline-shell-narrow"'),
    );
  });

  it("renders the space detail header shell and nav", () => {
    const html = renderSpaceDetail({
      spaceName: "Technik.cafe",
      country: "Germany",
      sourceWikiUrl: "https://wiki.hackerspaces.org/Technik.cafe",
      siteUrl: "https://technik.cafe",
      homeHref: "/index.html",
      feedHref: "/feed/index.html",
      authorsIndexHref: "/authors/index.html",
      currentPageLabel: "Page 1 of 1",
      items: [],
    });

    expect(html).toContain('class="panel page-header page-header--narrow page-header--compact"');
    expect(html).toContain("<h1>Technik.cafe</h1>");
    expect(html).toContain("Country:");
    expect(html).toContain('class="about-link-muted" href="/about/index.html"');
    expect(html).toContain(">Wiki<");
    expect(html).toContain(">Website<");
    expect(html).toContain('href="/index.html"');
    expect(html).toContain('href="/feed/index.html"');
    expect(html).toContain('href="/curated/index.html"');
    expect(html).toContain('href="/authors/index.html"');
  });
});
