import { describe, expect, it } from "vitest";

import { buildDayPage, renderHtml } from "../../../scripts/prototype-newspaper-page.mjs";

// Minimal fixture that exercises all rendering paths:
// one item per section, one item with an image.
const ITEMS = [
  {
    title: "Hackathon Weekend",
    link: "https://example.com/hackathon",
    resolvedAuthor: "Alice",
    spaceName: "HackBase",
    summaryText: "Join us for a weekend of hacking.",
    attachments: [{ url: "https://example.com/image.jpg", type: "image/jpeg" }],
    normalizedCategories: ["events"],
  },
  {
    title: "New CNC Router",
    link: "https://example.com/cnc",
    resolvedAuthor: null,
    spaceName: "MakerSpace",
    summaryText: "We installed a new CNC router.",
    attachments: [],
    normalizedCategories: ["projects"],
  },
  {
    title: "Open Source Roundup",
    link: "https://example.com/oss",
    resolvedAuthor: "Bob",
    spaceName: null,
    summaryText: null,
    attachments: [],
    normalizedCategories: ["news"],
  },
];

const AVAILABLE_DATES = ["2026-04-12", "2026-04-11", "2026-04-10"];
const CURRENT_DATE = "2026-04-12";
const NOW = new Date("2026-04-13T12:00:00.000Z"); // so 2026-04-12 is "Yesterday"

function buildHtml() {
  const dayPage = buildDayPage(ITEMS, AVAILABLE_DATES, CURRENT_DATE, NOW);
  return renderHtml(dayPage);
}

describe("renderHtml contract", () => {
  it("contains section headers only for sections that have items", () => {
    const html = buildHtml();
    // fixture has items in Events, Projects, News — these must appear
    expect(html).toContain("Events");
    expect(html).toContain("Projects");
    expect(html).toContain("News");
    // fixture has no Workshops or Community items — those sections are suppressed
    expect(html).not.toContain("Workshops");
    expect(html).not.toContain("Community");
  });

  it("contains column grid containers", () => {
    const html = buildHtml();
    // Each section renders a .np-columns div with .np-column children
    expect(html).toContain('class="np-columns"');
    expect(html).toContain("np-column");
  });

  it("renders each item title as a link", () => {
    const html = buildHtml();
    expect(html).toContain('<a href="https://example.com/hackathon">Hackathon Weekend</a>');
    expect(html).toContain('<a href="https://example.com/cnc">New CNC Router</a>');
    expect(html).toContain('<a href="https://example.com/oss">Open Source Roundup</a>');
  });

  it("renders image only for items that have an imageUrl", () => {
    const html = buildHtml();
    // Only the events item has an image
    expect(html).toContain('<img class="np-item-image" src="https://example.com/image.jpg"');
    // Items without images must not produce stray img tags (beyond the one above)
    const imgMatches = html.match(/<img /g) || [];
    expect(imgMatches.length).toBe(1);
  });

  it("renders current date as active section-nav link", () => {
    const html = buildHtml();
    // common/ pages are 1 level deep → ../common/ prefix for date links
    expect(html).toContain(`href="../common/2026-04-12.html" aria-current="page"`);
    expect(html).toContain("Yesterday");
  });

  it("renders prev/next as plain section-nav links", () => {
    const html = buildHtml();
    expect(html).toContain('href="../common/2026-04-11.html"');
  });

  it("renders a dropdown with all available dates below the nav", () => {
    const html = buildHtml();
    expect(html).toContain('class="control-select np-date-select"');
    expect(html).toContain('value="../common/2026-04-12.html" selected');
    expect(html).toContain('value="../common/2026-04-11.html"');
    expect(html).toContain('value="../common/2026-04-10.html"');
  });

  it("references the external CSS file with correct relative path", () => {
    const html = buildHtml();
    // common/ is 1 level deep → ../newspaper-prototype.css
    expect(html).toContain('href="../newspaper-prototype.css"');
  });

  it("includes the site.css link tag", () => {
    const html = buildHtml();
    expect(html).toContain('href="/static/site.css"');
  });

  it("renders the site header with the four nav links", () => {
    const html = buildHtml();
    expect(html).toContain("Hackerspaces");
    expect(html).toContain('href="/news/index.html"');
    expect(html).toContain('href="/curated/index.html"');
    expect(html).toContain('href="/authors/index.html"');
  });

  it("omits body text when summaryText is absent", () => {
    const html = buildHtml();
    // Open Source Roundup has no summaryText — no np-item-body paragraph for it
    // Check the title is there but no body paragraph follows directly
    // Simple check: count np-item-body occurrences (should be 2: events + projects)
    const bodyMatches = html.match(/class="np-item-body"/g) || [];
    expect(bodyMatches.length).toBe(2);
  });
});
