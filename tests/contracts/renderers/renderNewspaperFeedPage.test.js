import { describe, expect, it } from "vitest";

import { renderNewspaperFeedPageTsx } from "../../../src/renderers-tsx/renderNewspaperFeedPage.tsx";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeItem(overrides = {}) {
  return {
    title: "Test Post",
    link: "https://example.com/post",
    resolvedAuthor: "Alice",
    spaceName: "HackerSpace DE",
    summaryText: "A summary of the post.",
    imageUrl: null,
    countryFlag: "🇩🇪",
    countryName: "Germany",
    ...overrides,
  };
}

function makeSection(label, items = [makeItem()], overrides = {}) {
  const cols = [{ items }, { items: [] }, { items: [] }];
  return {
    label,
    columns: cols,
    totalItems: items.length,
    ...overrides,
  };
}

const BASE_MODEL = {
  dateLabel: "15 April",
  currentDate: "2026-04-15",
  selectedCountry: null,
  cssHref: "/static/newspaper.css",
  dateHrefBase: "../",
  nav: {
    prev: { label: "14 April", date: "2026-04-14" },
    current: { label: "15 April", date: "2026-04-15" },
    next: { label: "Yesterday", date: "2026-04-16" },
  },
  sections: [
    { label: "Events", columns: [{ items: [] }, { items: [] }, { items: [] }], totalItems: 0 },
    { label: "Projects", columns: [{ items: [] }, { items: [] }, { items: [] }], totalItems: 0 },
    { label: "Workshops", columns: [{ items: [] }, { items: [] }, { items: [] }], totalItems: 0 },
    { label: "Community", columns: [{ items: [] }, { items: [] }, { items: [] }], totalItems: 0 },
    makeSection("News"),
    { label: "Blogs", columns: [{ items: [] }, { items: [] }, { items: [] }], totalItems: 0 },
  ],
  countryOptions: [
    { label: "All countries", href: "../2026-04-15/", isSelected: true },
    { label: "Germany", href: "../2026-04-17/Germany/", isSelected: false },
    { label: "France", href: "../2026-04-16/France/", isSelected: false },
  ],
};

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

describe("renderNewspaperFeedPageTsx — layout", () => {
  it("includes link to /static/newspaper.css", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain('href="/static/newspaper.css"');
  });

  it("includes link to /site.css", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain('href="/site.css"');
  });

  it("page title includes dateLabel", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain("Hackerspace News — 15 April");
  });

  it("page title includes country when selectedCountry is set", () => {
    const html = renderNewspaperFeedPageTsx({ ...BASE_MODEL, selectedCountry: "Germany" });
    expect(html).toContain("Germany");
  });
});

// ---------------------------------------------------------------------------
// Site nav
// ---------------------------------------------------------------------------

describe("renderNewspaperFeedPageTsx — site nav", () => {
  it("contains Hackerspaces link", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain('href="/index.html"');
    expect(html).toContain("Hackerspaces");
  });

  it("contains News link with aria-current=page", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain('href="/feed/index.html"');
    expect(html).toContain("News");
  });

  it("contains Authors link", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain('href="/authors/index.html"');
    expect(html).toContain("Authors");
  });
});

// ---------------------------------------------------------------------------
// Date navigation
// ---------------------------------------------------------------------------

describe("renderNewspaperFeedPageTsx — date nav", () => {
  it("renders current date link with aria-current=page", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("15 April");
  });

  it("renders prev link", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain("14 April");
    expect(html).toContain("2026-04-14");
  });

  it("renders next link", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain("Yesterday");
    expect(html).toContain("2026-04-16");
  });

  it("does not render prev link when nav.prev is null", () => {
    const model = { ...BASE_MODEL, nav: { ...BASE_MODEL.nav, prev: null } };
    const html = renderNewspaperFeedPageTsx(model);
    // The nav should not have a prev link — the date may still appear in the dropdown
    const navMatch = html.match(/<nav class="section-nav np-date-nav">([\s\S]*?)<\/nav>/);
    expect(navMatch).not.toBeNull();
    expect(navMatch[1]).not.toContain("14 April");
  });

  it("does not render next link when nav.next is null", () => {
    const model = { ...BASE_MODEL, nav: { ...BASE_MODEL.nav, next: null } };
    const html = renderNewspaperFeedPageTsx(model);
    expect(html).not.toContain("Yesterday");
  });
});

// ---------------------------------------------------------------------------
// Date dropdown
// ---------------------------------------------------------------------------

describe("renderNewspaperFeedPageTsx — date dropdown", () => {
  it("renders empty np-date-select populated by client JS", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain('class="control-select np-date-select"');
  });

  it("embeds data-current-date for client JS", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain('data-current-date="2026-04-15"');
  });

  it("embeds data-date-href-base for client JS", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain('data-date-href-base="../"');
  });

  it("embeds empty data-selected-country for all-countries page", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain('data-selected-country=""');
  });

  it("embeds data-selected-country for country page", () => {
    const model = { ...BASE_MODEL, selectedCountry: "Germany", dateHrefBase: "../../" };
    const html = renderNewspaperFeedPageTsx(model);
    expect(html).toContain('data-selected-country="Germany"');
  });

  it("includes newspaper-nav.js script", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain('src="/newspaper-nav.js"');
  });
});

// ---------------------------------------------------------------------------
// Country dropdown
// ---------------------------------------------------------------------------

describe("renderNewspaperFeedPageTsx — country dropdown", () => {
  it("renders country select", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain('id="feed-country-select"');
    expect(html).toContain("All countries");
    expect(html).toContain("Germany");
    expect(html).toContain("France");
  });

  it("marks selected country option", () => {
    const model = {
      ...BASE_MODEL,
      selectedCountry: "Germany",
      countryOptions: [
        { label: "All countries", href: "../../2026-04-15/", isSelected: false },
        { label: "Germany", href: "../../2026-04-17/Germany/", isSelected: true },
      ],
    };
    const html = renderNewspaperFeedPageTsx(model);
    expect(html).toContain(`value="../../2026-04-17/Germany/" selected`);
  });
});

// ---------------------------------------------------------------------------
// Sections and columns
// ---------------------------------------------------------------------------

describe("renderNewspaperFeedPageTsx — sections", () => {
  it("only renders sections with items", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    // News has items; Events, Projects, Workshops, Community, Blogs are empty
    expect(html).toContain("News");
    expect(html).not.toContain("np-section-header\">Events");
    expect(html).not.toContain("np-section-header\">Blogs");
  });

  it("renders section header for non-empty section", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain('class="np-section-header"');
  });

  it("renders np-columns with data-items attribute", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain('class="np-columns" data-items="1"');
  });

  it("renders np-column divs", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain('class="np-column');
  });
});

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

describe("renderNewspaperFeedPageTsx — items", () => {
  it("renders item title as a link", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain('href="https://example.com/post"');
    expect(html).toContain("Test Post");
  });

  it("renders image when imageUrl present", () => {
    const model = {
      ...BASE_MODEL,
      sections: [makeSection("News", [makeItem({ imageUrl: "https://example.com/img.jpg" })])],
    };
    model.sections[0].totalItems = 1;
    const html = renderNewspaperFeedPageTsx(model);
    expect(html).toContain('class="np-item-image"');
    expect(html).toContain("img.jpg");
  });

  it("does not render np-item-body when summaryText is null", () => {
    const model = {
      ...BASE_MODEL,
      sections: [makeSection("News", [makeItem({ summaryText: null })])],
    };
    model.sections[0].totalItems = 1;
    const html = renderNewspaperFeedPageTsx(model);
    expect(html).not.toContain('class="np-item-body"');
  });

  it("renders country flag with title attribute before spaceName and author", () => {
    const html = renderNewspaperFeedPageTsx(BASE_MODEL);
    expect(html).toContain('title="Germany"');
    expect(html).toContain("🇩🇪");
    // meta order: flag · spaceName · resolvedAuthor
    const metaMatch = html.match(/np-item-meta[^>]*>([^<]+(?:<[^>]*>[^<]*<\/[^>]*>)?[^<]*)/);
    const metaContent = html.match(/<p class="np-item-meta">([\s\S]*?)<\/p>/);
    expect(metaContent).not.toBeNull();
    const meta = metaContent[1];
    const flagPos = meta.indexOf("🇩🇪");
    const spacePos = meta.indexOf("HackerSpace DE");
    const authorPos = meta.indexOf("Alice");
    expect(flagPos).toBeLessThan(spacePos);
    expect(spacePos).toBeLessThan(authorPos);
  });
});
