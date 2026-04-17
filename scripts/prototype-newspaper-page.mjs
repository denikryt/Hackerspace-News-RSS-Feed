/**
 * Newspaper-style feed prototype.
 *
 * Reads data/feeds_normalized.json and writes a standalone HTML page to
 * tmp/newspaper-prototype.html + tmp/newspaper-prototype.css for visual review.
 *
 * This is not part of the production render pipeline. Its purpose is to
 * validate the layout, typography, and section structure before committing
 * to pipeline integration (see plans/20_NEWSPAPER_PROD_RENDER_PLAN.md).
 *
 * Usage: node scripts/prototype-newspaper-page.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Country flags
// ---------------------------------------------------------------------------

const COUNTRY_FLAGS = {
  "Argentina": "🇦🇷",
  "Australia": "🇦🇺",
  "Austria": "🇦🇹",
  "Belgium": "🇧🇪",
  "Bolivia": "🇧🇴",
  "Brazil": "🇧🇷",
  "Bulgaria": "🇧🇬",
  "CANADA": "🇨🇦",
  "Canada": "🇨🇦",
  "Catalonia": "🏴",
  "China": "🇨🇳",
  "Colombia": "🇨🇴",
  "Croatia": "🇭🇷",
  "Czech Republic": "🇨🇿",
  "Denmark": "🇩🇰",
  "Egypt": "🇪🇬",
  "Finland": "🇫🇮",
  "France": "🇫🇷",
  "Germany": "🇩🇪",
  "Hong Kong": "🇭🇰",
  "Hungary": "🇭🇺",
  "India": "🇮🇳",
  "Ireland": "🇮🇪",
  "Israel": "🇮🇱",
  "Italy": "🇮🇹",
  "Latvia": "🇱🇻",
  "Luxembourg": "🇱🇺",
  "Mexico": "🇲🇽",
  "Nepal": "🇳🇵",
  "Netherlands": "🇳🇱",
  "New Zealand": "🇳🇿",
  "Nigeria": "🇳🇬",
  "Norway": "🇳🇴",
  "Pakistan": "🇵🇰",
  "Poland": "🇵🇱",
  "Romania": "🇷🇴",
  "Russian Federation": "🇷🇺",
  "Slovenia": "🇸🇮",
  "South Africa": "🇿🇦",
  "Spain": "🇪🇸",
  "Sweden": "🇸🇪",
  "Switzerland": "🇨🇭",
  "Togo": "🇹🇬",
  "Türkiye": "🇹🇷",
  "Ukraine": "🇺🇦",
  "United Kingdom": "🇬🇧",
  "United States of America": "🇺🇸",
};

// ---------------------------------------------------------------------------
// Section assignment
// ---------------------------------------------------------------------------

// Maps each normalized category to its display section.
// Each category from the dictionary gets its own section rather than being merged.
// uncategorized falls back to News as it has no meaningful section of its own.
const SECTION_EVENTS = "Events";
const SECTION_PROJECTS = "Projects";
const SECTION_WORKSHOPS = "Workshops";
const SECTION_NEWS = "News";
const SECTION_BLOGS = "Blogs";
const SECTION_COMMUNITY = "Community";

const CATEGORY_TO_SECTION = {
  events: SECTION_EVENTS,
  projects: SECTION_PROJECTS,
  workshops: SECTION_WORKSHOPS,
  news: SECTION_NEWS,
  blogs: SECTION_BLOGS,
  community: SECTION_COMMUNITY,
  uncategorized: SECTION_NEWS,
};

// Canonical display order of sections.
const ALL_SECTIONS = [
  SECTION_EVENTS,
  SECTION_PROJECTS,
  SECTION_WORKSHOPS,
  SECTION_COMMUNITY,
  SECTION_NEWS,
  SECTION_BLOGS,
];

// Sections considered "generic" — any more specific section takes priority over these.
const GENERIC_SECTIONS = new Set([SECTION_NEWS]);

/**
 * Assigns an item to a display section based on its normalizedCategories.
 *
 * Two-pass strategy: first look for a specific (non-generic) section among all
 * categories; only fall back to a generic section (News) if nothing specific is
 * found. This means an item tagged ["news", "workshops"] goes to Workshops, not News.
 */
export function assignSection(item) {
  const categories = item.normalizedCategories || [];
  let genericFallback = null;

  for (const cat of categories) {
    const section = CATEGORY_TO_SECTION[cat];
    if (!section) continue;
    if (!GENERIC_SECTIONS.has(section)) return section;
    // Remember the first generic match in case no specific section is found.
    if (!genericFallback) genericFallback = section;
  }

  return genericFallback ?? SECTION_NEWS;
}

// ---------------------------------------------------------------------------
// Section grouping
// ---------------------------------------------------------------------------

/**
 * Groups items into display sections in canonical order.
 * Every section is always present even if empty, so the renderer can
 * rely on a stable structure.
 */
export function groupBySection(items) {
  const sections = ALL_SECTIONS.map((label) => ({ label, items: [] }));
  const byLabel = Object.fromEntries(sections.map((s) => [s.label, s.items]));

  for (const item of items) {
    byLabel[assignSection(item)].push(item);
  }
  return sections;
}

// ---------------------------------------------------------------------------
// Available dates
// ---------------------------------------------------------------------------

/**
 * Extracts sorted unique date strings (YYYY-MM-DD) that have at least one
 * item, excluding future dates beyond `today`. Returned newest-first.
 *
 * `today` is a YYYY-MM-DD string used as the upper bound so that items with
 * far-future dates (data artifacts) are excluded from navigation.
 */
export function buildAvailableDates(items, today) {
  const seen = new Set();
  for (const item of items) {
    const raw = item.displayDate;
    if (!raw || typeof raw !== "string") continue;
    const dateStr = raw.slice(0, 10);
    // Validate YYYY-MM-DD format and reject anything that isn't a real date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
    if (dateStr > today) continue;
    seen.add(dateStr);
  }
  return [...seen].sort().reverse();
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

/**
 * Loads all items from feeds_normalized.json, attaches spaceName/country from
 * the feed record, and filters to items whose displayDate falls on targetDate
 * (YYYY-MM-DD string). Returns the filtered item array.
 */
export function loadItems(feedsPath, targetDate) {
  const raw = JSON.parse(fs.readFileSync(feedsPath, "utf8"));
  const allItems = raw.feeds.flatMap((feed) =>
    (feed.items || []).map((item) => ({
      ...item,
      spaceName: feed.spaceName,
      country: feed.country,
    })),
  );
  return allItems.filter(
    (item) => item.displayDate && item.displayDate.slice(0, 10) === targetDate,
  );
}

// ---------------------------------------------------------------------------
// Column distribution
// ---------------------------------------------------------------------------

/**
 * Distributes items into n balanced columns using round-robin assignment.
 * Items at index 0, n, 2n, … go to column 0; index 1, n+1, … to column 1, etc.
 * This keeps visual weight even when item counts are not divisible by n.
 */
export function distributeIntoColumns(items, n) {
  const columns = Array.from({ length: n }, () => ({ items: [] }));
  items.forEach((item, i) => columns[i % n].items.push(item));
  return columns;
}

// ---------------------------------------------------------------------------
// Date navigation
// ---------------------------------------------------------------------------

/**
 * Builds the prev/current/next navigation model for the date bar.
 *
 * availableDates is sorted newest-first. Returns an object with:
 *   - prev: the day after currentDate in the list (newer), or null
 *   - current: { label, date }
 *   - next: the day before currentDate in the list (older), or null
 *
 * "prev" means one step back in time (older), "next" means one step forward
 * (newer). Labels use "Today" / "Yesterday" / "DD Month".
 *
 * `now` is a Date object passed in so tests can control the reference point.
 */
export function buildDateNav(availableDates, currentDate, now) {
  const todayStr = toDateStr(now);
  const yesterdayStr = toDateStr(new Date(now.getTime() - 86_400_000));

  const idx = availableDates.indexOf(currentDate);

  // availableDates is newest-first, so index - 1 is a newer date (next),
  // and index + 1 is an older date (prev).
  const newerDate = idx > 0 ? availableDates[idx - 1] : null;
  const olderDate = idx < availableDates.length - 1 ? availableDates[idx + 1] : null;

  function label(date) {
    if (date === todayStr) return "Today";
    if (date === yesterdayStr) return "Yesterday";
    return formatDayMonth(date);
  }

  return {
    prev: olderDate ? { label: label(olderDate), date: olderDate } : null,
    current: { label: label(currentDate), date: currentDate },
    next: newerDate ? { label: label(newerDate), date: newerDate } : null,
  };
}

/** Formats a YYYY-MM-DD string as "DD Month" (e.g. "12 April"). */
function formatDayMonth(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(d);
  return `${day} ${monthName}`;
}

/** Formats a YYYY-MM-DD string as "DD Month YYYY" (e.g. "12 April 2026") — used in the dropdown. */
function formatDayMonthYear(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(d);
  return `${day} ${monthName} ${year}`;
}

/** Returns a YYYY-MM-DD string for a Date object (UTC). */
function toDateStr(date) {
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Page model assembly
// ---------------------------------------------------------------------------

/**
 * Builds the country selector options for a given date.
 *
 * Pages live at:
 *   common/YYYY-MM-DD.html          (all countries)
 *   country/EncodedName/YYYY-MM-DD.html  (per country)
 *
 * Links are relative so the output directory can be opened from any location.
 * selectedCountry is null for the all-countries view.
 */
/**
 * Builds country selector options.
 * availableDatesByCountry: Map<country, string[]> — dates sorted newest-first per country.
 * Each country option links to the most recent available date for that country.
 * "All countries" links to currentDate in common/.
 */
export function buildCountryOptions(availableCountries, currentDate, selectedCountry, availableDatesByCountry = new Map()) {
  const base = selectedCountry === null ? "../" : "../../";

  const allOption = {
    label: "All countries",
    href: `${base}common/${currentDate}.html`,
    isSelected: selectedCountry === null,
  };
  const countryOptions = availableCountries.map((country) => {
    const dates = availableDatesByCountry.get(country) || [];
    const latestDate = dates[0] || currentDate;
    return {
      label: country,
      href: `${base}country/${encodeCountry(country)}/${latestDate}.html`,
      isSelected: country === selectedCountry,
    };
  });
  return [allOption, ...countryOptions];
}

/** Encodes a country name for use in a directory name (spaces → underscores, safe chars only). */
export function encodeCountry(country) {
  return country.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "");
}

/**
 * Assembles the full DayPage model from raw items and available date list.
 * Maps each item to the lightweight Item shape used by the renderer.
 * selectedCountry is null for the all-countries view, or a country string to filter by.
 */
/**
 * Assembles the full DayPage model from raw items and available date list.
 * dropdownDates: dates shown in the date dropdown — for country pages this is
 * only dates that have items for that country; for all-countries it's all dates.
 */
export function buildDayPage(rawItems, availableDates, currentDate, now, selectedCountry = null, dropdownDates = null) {
  const sections = groupBySection(rawItems).map((section) => ({
    label: section.label,
    columns: distributeIntoColumns(section.items.map(toItem), 3),
  }));
  const nav = buildDateNav(availableDates, currentDate, now);

  const depth = selectedCountry === null ? 1 : 2;
  const up = "../".repeat(depth);

  const dateHrefBase = selectedCountry === null
    ? `${up}common/`
    : `${up}country/${encodeCountry(selectedCountry)}/`;

  return {
    dateLabel: formatDayMonth(currentDate),
    currentDate,
    selectedCountry,
    cssHref: `${up}newspaper-prototype.css`,
    dateHrefBase,
    nav,
    allDates: dropdownDates ?? availableDates,
    sections,
  };
}

/**
 * Maps a raw normalized item to the Item shape used by the renderer.
 * Picks the first image attachment if present; uses summaryText as body.
 */
function toItem(raw) {
  const imageAttachment = (raw.attachments || []).find(
    (a) => a.type && a.type.startsWith("image/"),
  );
  return {
    title: raw.title || "",
    link: raw.link || "",
    author: raw.resolvedAuthor || null,
    sourceName: raw.spaceName || null,
    bodyText: raw.summaryText || raw.contentText || null,
    imageUrl: imageAttachment ? imageAttachment.url : null,
    countryFlag: raw.country ? (COUNTRY_FLAGS[raw.country] || null) : null,
    countryName: raw.country || null,
  };
}

// ---------------------------------------------------------------------------
// HTML rendering
// ---------------------------------------------------------------------------

/** Escapes characters that are unsafe in HTML text nodes and attribute values. */
function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Renders a single Item to an HTML fragment.
 * Image is included only when imageUrl is present (per AGENTS.md rendering rule).
 */
function renderItem(item) {
  const image = item.imageUrl
    ? `<img class="np-item-image" src="${esc(item.imageUrl)}" alt="">`
    : "";

  const flagHtml = item.countryFlag && item.countryName
    ? `<span title="${esc(item.countryName)}">${item.countryFlag}</span>`
    : (item.countryFlag || "");
  const metaParts = [flagHtml, item.sourceName, item.author].filter(Boolean);
  const meta = metaParts.join(" · ");
  const metaHtml = meta ? `<p class="np-item-meta">${meta}</p>` : "";

  // Clamp body text to keep columns balanced; full text available at link.
  const bodyHtml = item.bodyText
    ? `<p class="np-item-body">${esc(item.bodyText)}</p>`
    : "";

  return `<article class="np-item">
    <h3 class="np-item-title"><a href="${esc(item.link)}">${esc(item.title)}</a></h3>
    ${metaHtml}
    ${image}
    ${bodyHtml}
  </article>`;
}

/**
 * Renders a Section (label + 3 columns) to HTML.
 * The section header spans all columns as a full-width divider.
 */
function renderSection(section) {
  const totalItems = section.columns.reduce((sum, col) => sum + col.items.length, 0);
  const columnsHtml = section.columns
    .map(
      (col, i) =>
        `<div class="np-column${i < section.columns.length - 1 ? " np-column--rule" : ""}">${col.items.map(renderItem).join("")}</div>`,
    )
    .join("");

  return `<section class="np-section">
  <h2 class="np-section-header">${esc(section.label)}</h2>
  <div class="np-columns" data-items="${totalItems}">${columnsHtml}</div>
</section>`;
}

/**
 * Renders the date navigation area:
 *   - three buttons (prev / current / next) styled as .section-nav
 *   - below: a <select> dropdown listing all available dates for direct jump
 *
 * Uses the same .section-nav pattern as the rest of the site so the three
 * date buttons look identical to the top nav (muted inactive, bold black active).
 */
function renderDateNav(nav, currentDate, allDates, dateHrefBase) {
  // dateHrefBase is a relative path prefix so links resolve correctly regardless
  // of whether this page is in common/ or country/X/.
  const href = (date) => `${dateHrefBase}${date}.html`;

  const prevLink = nav.prev
    ? `<a href="${esc(href(nav.prev.date))}">${esc(nav.prev.label)}</a>`
    : "";

  const currentLink = `<a href="${esc(href(currentDate))}" aria-current="page">${esc(nav.current.label)}</a>`;

  const nextLink = nav.next
    ? `<a href="${esc(href(nav.next.date))}">${esc(nav.next.label)}</a>`
    : "";

  const options = allDates
    .map(
      (date) =>
        `<option value="${esc(href(date))}"${date === currentDate ? " selected" : ""}>${esc(formatDayMonthYear(date))}</option>`,
    )
    .join("");

  const dateSelect = `<label class="feed-control feed-control-date"><select class="control-select np-date-select" onchange="location.href=this.value">${options}</select></label>`;

  return `<nav class="section-nav np-date-nav">
  ${prevLink}
  ${currentLink}
  ${nextLink}
</nav>
<section class="feed-controls-shell">
<div class="feed-controls feed-controls-np">${dateSelect}</div>
</section>`;
}

/**
 * Appends the country select into the selects row already rendered by renderDateNav.
 * Returns the combined HTML with both dropdowns in one line.
 */
function appendCountrySelect(navHtml, countryOptions) {
  if (!countryOptions || countryOptions.length === 0) return navHtml;
  const opts = countryOptions
    .map((opt) => `<option value="${esc(opt.href)}"${opt.isSelected ? " selected" : ""}>${esc(opt.label)}</option>`)
    .join("");
  const countrySelect = `<label class="feed-control feed-control-country"><select id="feed-country-select" class="control-select" aria-label="Choose feed country" onchange="location.href=this.value">${opts}</select></label>`;
  return navHtml.replace('</div>\n</section>', `${countrySelect}</div>\n</section>`);
}

/**
 * Renders the full DayPage model to an HTML string.
 * References external CSS file so styles can be reviewed and edited separately.
 */
export function renderHtml(dayPage, countryOptions = []) {
  const sectionsHtml = dayPage.sections
    .filter((s) => s.columns.some((c) => c.items.length > 0))
    .map(renderSection)
    .join("\n");
  const navHtml = appendCountrySelect(
    renderDateNav(dayPage.nav, dayPage.currentDate, dayPage.allDates, dayPage.dateHrefBase),
    countryOptions,
  );

  const countryTitle = dayPage.selectedCountry ? ` — ${dayPage.selectedCountry}` : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hackerspace Feed — ${esc(dayPage.dateLabel)}${esc(countryTitle)}</title>
    <link rel="icon" href="/favicon.png" type="image/png" />
    <link rel="stylesheet" href="/static/site.css" />
    <link rel="stylesheet" href="${esc(dayPage.cssHref)}" />
  </head>
  <body>
    <main>
      <header class="page-header">
        <h1 class="page-title">Hackerspace News</h1>
        <nav class="section-nav page-nav">
          <a href="/index.html">Hackerspaces</a>
          <a href="/news/index.html" aria-current="page">News</a>
          <a href="/curated/index.html">Curated</a>
          <a href="/authors/index.html">Authors</a>
        </nav>
      </header>
      ${navHtml}
      ${sectionsHtml}
    </main>
  </body>
</html>`;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/** CSS for the newspaper layout. Builds on existing site.css design tokens. */
const NEWSPAPER_CSS = `/*
 * Newspaper-style feed prototype CSS.
 * Extends /static/site.css — reuses its design tokens and base styles.
 * Only adds new rules for the column grid, section headers, and item layout.
 */

/* Reduce gap between site nav and date nav */
.page-header {
  margin-bottom: 0;
  padding-bottom: 0;
}
.page-nav.section-nav {
  margin-bottom: 0;
  padding-bottom: 4px;
}

/* Date and country selects row — two equal-width dropdowns */
.feed-controls-np {
  display: flex !important;
  gap: 12px;
  margin-bottom: 1.5rem;
}
.feed-controls-np .feed-control {
  flex: 1;
  min-inline-size: 0;
  display: block;
}
.feed-controls-np .feed-control .control-select {
  inline-size: 100% !important;
  max-inline-size: 100% !important;
}

/* Section: full-width bold uppercase header above the column grid */
.np-section {
  margin-bottom: 2.5rem;
}

.np-section-header {
  grid-column: 1 / -1;
  border-top: 2px solid var(--border-strong);
  padding-top: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text);
}

/* Three-column newspaper layout using CSS columns — browser distributes items automatically */
.np-columns {
  column-count: 3;
  column-gap: 0;
  column-rule: 1px solid var(--border);
}
.np-columns[data-items="1"] { column-count: 1; }
.np-columns[data-items="2"] { column-count: 2; }

@media (max-width: 600px) {
  .np-columns {
    column-count: 2;
  }
}

.np-column {
  display: contents;
}

.np-column--rule {
  /* rules handled by column-rule above */
}

/* Item layout */
.np-item {
  break-inside: avoid;
  padding: 0 0.6rem 1.5rem;
  overflow-wrap: break-word;
  word-break: break-word;
}

.np-item-image {
  display: block;
  max-width: 100%;
  max-height: 220px;
  width: auto;
  height: auto;
  margin-bottom: 0.6rem;
}

.np-item-title {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 0 0 0.3rem;
}

.np-item-title a {
  color: var(--text);
  text-decoration: none;
}

.np-item-title a:hover {
  text-decoration: underline;
  color: var(--accent);
}

.np-item-meta {
  font-size: 0.75rem;
  color: var(--muted);
  margin: 0 0 0.35rem;
}

/* Body text clamped to ~4 lines for visual balance across columns */
.np-item-body {
  font-size: 0.85rem;
  line-height: 1.55;
  color: var(--text);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 600px) {
  .np-item-body {
    -webkit-line-clamp: 8;
  }
}
`;

/**
 * Writes rendered HTML pages and shared CSS to outDir.
 * Each page has a `filename` (e.g. "2026-04-12.html" or "2026-04-12--country--Germany.html").
 * CSS is written once as newspaper-prototype.css shared by all pages.
 * Creates outDir if it doesn't exist.
 */
export function writeOutput(pages, css, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const { filename, html } of pages) {
    fs.writeFileSync(path.join(outDir, filename), html, "utf8");
  }
  fs.writeFileSync(path.join(outDir, "newspaper-prototype.css"), css, "utf8");
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

// Only runs when invoked directly (not imported by tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // CLI options:
  //   --days=N     how many most-recent days to render (default: 7)
  //   --out=PATH   output directory relative to project root (default: tmp)
  const args = Object.fromEntries(
    process.argv.slice(2)
      .filter((a) => a.startsWith("--"))
      .map((a) => a.slice(2).split("=")),
  );
  const maxDays = parseInt(args.days ?? "7", 10);
  const outDir = path.resolve(PROJECT_ROOT, args.out ?? "tmp");

  const feedsPath = path.join(PROJECT_ROOT, "data/feeds_normalized.json");
  const now = new Date();

  // Parse feeds_normalized.json directly in Node, picking only the fields needed
  // for rendering. The full file is ~100MB but JSON.parse + field selection completes
  // in ~420ms and stays within 512MB heap (run with --max-old-space-size=512).
  // This is ~3x faster than piping through jq.
  const rawData = JSON.parse(fs.readFileSync(feedsPath, "utf8"));
  const allItems = rawData.feeds.flatMap((feed) =>
    (feed.items || []).map((item) => ({
      title: item.title,
      link: item.link,
      displayDate: item.displayDate,
      resolvedAuthor: item.resolvedAuthor,
      summaryText: item.summaryText,
      normalizedCategories: item.normalizedCategories,
      attachments: item.attachments,
      spaceName: feed.spaceName,
      country: feed.country,
    })),
  );

  const today = now.toISOString().slice(0, 10);
  const availableDates = buildAvailableDates(allItems, today);

  if (availableDates.length === 0) {
    console.error("No items found for any date up to today.");
    process.exit(1);
  }

  // All countries that appear in the dataset, sorted.
  const allCountries = [...new Set(allItems.map((i) => i.country).filter(Boolean))].sort();

  // Build availableDatesByCountry: Map<country, string[]> — dates sorted newest-first.
  // Used for country dropdown (link to latest date) and date dropdown (only existing dates).
  const availableDatesByCountry = new Map();
  for (const country of allCountries) {
    const countryDates = buildAvailableDates(allItems.filter((i) => i.country === country), today);
    availableDatesByCountry.set(country, countryDates);
  }

  // Directory structure:
  //   outDir/common/YYYY-MM-DD.html
  //   outDir/country/EncodedName/YYYY-MM-DD.html
  //   outDir/newspaper-prototype.css  (shared)
  const commonDir = path.join(outDir, "common");
  fs.mkdirSync(commonDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "newspaper-prototype.css"), NEWSPAPER_CSS, "utf8");

  const datesToRender = availableDates.slice(0, maxDays);

  // Render and write each page immediately — never accumulate all HTML in memory.
  for (const date of datesToRender) {
    const dayItems = allItems.filter((i) => i.displayDate && i.displayDate.slice(0, 10) === date);

    // All-countries page → common/YYYY-MM-DD.html
    const dayPage = buildDayPage(dayItems, availableDates, date, now, null, availableDates);
    const countryOptions = buildCountryOptions(allCountries, date, null, availableDatesByCountry);
    fs.writeFileSync(path.join(commonDir, `${date}.html`), renderHtml(dayPage, countryOptions), "utf8");
    console.log(`common/${date}.html  (${dayItems.length} items)`);

    // Per-country pages → country/EncodedName/YYYY-MM-DD.html
    const countriesOnDay = [...new Set(dayItems.map((i) => i.country).filter(Boolean))].sort();
    for (const country of countriesOnDay) {
      const countryItems = dayItems.filter((i) => i.country === country);
      const countryDates = availableDatesByCountry.get(country) || [];
      const countryNavDates = countryDates.filter((d) => datesToRender.includes(d));
      const countryPage = buildDayPage(countryItems, countryNavDates, date, now, country, countryNavDates);
      const countryPageOptions = buildCountryOptions(allCountries, date, country, availableDatesByCountry);
      const countryDir = path.join(outDir, "country", encodeCountry(country));
      fs.mkdirSync(countryDir, { recursive: true });
      fs.writeFileSync(path.join(countryDir, `${date}.html`), renderHtml(countryPage, countryPageOptions), "utf8");
      console.log(`  country/${encodeCountry(country)}/${date}.html  (${countryItems.length} items)`);
    }
  }

  console.log(`\nDone. Written to: ${outDir}`);
}
