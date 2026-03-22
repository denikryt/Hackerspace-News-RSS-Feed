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
        { href: "/all/index.html", label: "All", isCurrent: false },
        { href: "/events/index.html", label: "Events", isCurrent: true },
        { href: "/other/index.html", label: "Other", isCurrent: false },
      ],
    });

    expect(html).toContain('class="panel page-header page-header--narrow page-header--compact"');
    expect(html).toContain("<h1>Events</h1>");
    expect(html).toContain("Items tagged as events.");
    expect(html).toContain('href="/index.html"');
    expect(html).toContain('href="/all/index.html"');
    expect(html).toContain('href="/events/index.html"');
  });

  it("renders the space detail header shell and nav", () => {
    const html = renderSpaceDetail({
      spaceName: "Technik.cafe",
      country: "Germany",
      sourceWikiUrl: "https://wiki.hackerspaces.org/Technik.cafe",
      siteUrl: "https://technik.cafe",
      homeHref: "/index.html",
      allContentHref: "/all/index.html",
      currentPageLabel: "Page 1 of 1",
      items: [],
    });

    expect(html).toContain('class="panel page-header page-header--narrow page-header--compact"');
    expect(html).toContain("<h1>Technik.cafe</h1>");
    expect(html).toContain("Country:");
    expect(html).toContain(">Wiki<");
    expect(html).toContain(">Website<");
    expect(html).toContain('href="/index.html"');
    expect(html).toContain('href="/all/index.html"');
  });
});
