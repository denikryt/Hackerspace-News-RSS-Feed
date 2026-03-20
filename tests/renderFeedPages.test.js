import { describe, expect, it } from "vitest";

import { renderGlobalFeed } from "../src/renderers/renderGlobalFeed.js";
import { renderSpaceDetail } from "../src/renderers/renderSpaceDetail.js";

describe("feed page headers", () => {
  it("renders the global feed header shell and nav", () => {
    const html = renderGlobalFeed({
      items: [],
      homeHref: "/index.html",
      currentPageLabel: "Page 1 of 1",
    });

    expect(html).toContain('class="panel page-shell-narrow page-masthead-compact"');
    expect(html).toContain("<h1>Global Feed</h1>");
    expect(html).toContain("All publications sorted from new to old.");
    expect(html).toContain('href="/index.html"');
    expect(html).toContain('href="/feed/index.html"');
  });

  it("renders the space detail header shell and nav", () => {
    const html = renderSpaceDetail({
      spaceName: "Technik.cafe",
      country: "Germany",
      sourceWikiUrl: "https://wiki.hackerspaces.org/Technik.cafe",
      siteUrl: "https://technik.cafe",
      homeHref: "/index.html",
      globalFeedHref: "/feed/index.html",
      currentPageLabel: "Page 1 of 1",
      items: [],
    });

    expect(html).toContain('class="panel page-shell-narrow page-masthead-compact"');
    expect(html).toContain("<h1>Technik.cafe</h1>");
    expect(html).toContain("Country:");
    expect(html).toContain(">Wiki<");
    expect(html).toContain(">Website<");
    expect(html).toContain('href="/index.html"');
    expect(html).toContain('href="/feed/index.html"');
  });
});
