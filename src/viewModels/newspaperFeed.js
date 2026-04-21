// ---------------------------------------------------------------------------
// Country flags
// ---------------------------------------------------------------------------

export const COUNTRY_FLAGS = {
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

const ALL_SECTIONS = [
  SECTION_EVENTS,
  SECTION_PROJECTS,
  SECTION_WORKSHOPS,
  SECTION_COMMUNITY,
  SECTION_NEWS,
  SECTION_BLOGS,
];

const GENERIC_SECTIONS = new Set([SECTION_NEWS]);

function assignSection(item) {
  const categories = item.normalizedCategories || [];
  let genericFallback = null;

  for (const cat of categories) {
    const section = CATEGORY_TO_SECTION[cat];
    if (!section) continue;
    if (!GENERIC_SECTIONS.has(section)) return section;
    if (!genericFallback) genericFallback = section;
  }

  return genericFallback ?? SECTION_NEWS;
}

function groupBySection(items) {
  const sections = ALL_SECTIONS.map((label) => ({ label, items: [] }));
  const byLabel = Object.fromEntries(sections.map((s) => [s.label, s.items]));

  for (const item of items) {
    byLabel[assignSection(item)].push(item);
  }
  return sections;
}

// ---------------------------------------------------------------------------
// Country path encoding
// ---------------------------------------------------------------------------

/** Encodes a country name for use in a URL path segment (spaces → underscores, safe chars only). */
export function encodeCountryForPath(country) {
  return country.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "");
}

// ---------------------------------------------------------------------------
// Available dates
// ---------------------------------------------------------------------------

/**
 * Extracts sorted unique date strings (YYYY-MM-DD) from normalizedPayload,
 * excluding future dates beyond `today`. Returned newest-first.
 */
export function buildAvailableDatesFromPayload(normalizedPayload, today) {
  const seen = new Set();
  for (const feed of normalizedPayload.feeds || []) {
    for (const item of feed.items || []) {
      const raw = item.displayDate;
      if (!raw || typeof raw !== "string") continue;
      const dateStr = raw.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
      if (dateStr > today) continue;
      seen.add(dateStr);
    }
  }
  return [...seen].sort().reverse();
}

/**
 * Returns a Map<country, string[]> of dates sorted newest-first per country.
 * Items without a country are excluded.
 */
export function buildAvailableDatesByCountry(normalizedPayload, today) {
  const byCountry = new Map();

  for (const feed of normalizedPayload.feeds || []) {
    const country = feed.country;
    if (!country) continue;

    for (const item of feed.items || []) {
      const raw = item.displayDate;
      if (!raw || typeof raw !== "string") continue;
      const dateStr = raw.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
      if (dateStr > today) continue;

      if (!byCountry.has(country)) byCountry.set(country, new Set());
      byCountry.get(country).add(dateStr);
    }
  }

  const result = new Map();
  for (const [country, dateSet] of byCountry) {
    result.set(country, [...dateSet].sort().reverse());
  }
  return result;
}

// ---------------------------------------------------------------------------
// Column distribution
// ---------------------------------------------------------------------------

function distributeIntoColumns(items, n) {
  const columns = Array.from({ length: n }, () => ({ items: [] }));
  items.forEach((item, i) => columns[i % n].items.push(item));
  return columns;
}

// ---------------------------------------------------------------------------
// Date navigation
// ---------------------------------------------------------------------------

function toDateStr(date) {
  return date.toISOString().slice(0, 10);
}

function formatDayMonth(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(d);
  return `${day} ${monthName}`;
}


// countryPath is appended to prev/next hrefs so country-page nav stays within the same country.
function buildDateNav(availableDates, currentDate, now, countryPath = "") {
  const todayStr = toDateStr(now);
  const yesterdayStr = toDateStr(new Date(now.getTime() - 86_400_000));

  const idx = availableDates.indexOf(currentDate);
  const newerDate = idx > 0 ? availableDates[idx - 1] : null;
  const olderDate = idx < availableDates.length - 1 ? availableDates[idx + 1] : null;

  function label(date) {
    if (date === todayStr) return "Today";
    if (date === yesterdayStr) return "Yesterday";
    return formatDayMonth(date);
  }

  return {
    prev: olderDate ? { label: label(olderDate), date: olderDate, countryPath } : null,
    current: { label: label(currentDate), date: currentDate },
    next: newerDate ? { label: label(newerDate), date: newerDate, countryPath } : null,
  };
}

// ---------------------------------------------------------------------------
// Item mapping
// ---------------------------------------------------------------------------

function toItem(raw) {
  const imageAttachment = (raw.attachments || []).find(
    (a) => a.type && a.type.startsWith("image/"),
  );
  // categoriesRaw carries the original feed tags unmodified; null when absent or empty.
  const categoriesRaw = raw.categoriesRaw?.length ? raw.categoriesRaw : null;
  return {
    title: raw.title || "",
    link: raw.link || "",
    resolvedAuthor: raw.resolvedAuthor || null,
    spaceName: raw.spaceName || null,
    contentHtml: raw.contentHtml || null,
    contentText: raw.contentText || null,
    summaryHtml: raw.summaryHtml || null,
    summaryText: raw.summaryText || null,
    imageUrl: imageAttachment ? imageAttachment.url : null,
    countryFlag: raw.country ? (COUNTRY_FLAGS[raw.country] || null) : null,
    countryName: raw.country || null,
    categoriesRaw,
  };
}

// ---------------------------------------------------------------------------
// Country options
// ---------------------------------------------------------------------------

function buildCountryOptions(availableCountries, currentDate, selectedCountry, availableDatesByCountry, dateHrefBase) {
  const allHref = `${dateHrefBase}${currentDate}/`;
  const allOption = {
    label: "All countries",
    href: allHref,
    isSelected: selectedCountry === null,
  };

  const countryOptions = availableCountries.map((country) => {
    const dates = availableDatesByCountry.get(country) || [];
    const latestDate = dates[0] || currentDate;
    return {
      label: country,
      href: `${dateHrefBase}${latestDate}/${encodeCountryForPath(country)}/`,
      isSelected: country === selectedCountry,
    };
  });

  return [allOption, ...countryOptions];
}

// ---------------------------------------------------------------------------
// Day model
// ---------------------------------------------------------------------------

/**
 * Builds the full DayPage model for a newspaper-style feed page.
 *
 * itemsForDate: pre-filtered items for this specific date (caller's responsibility).
 * targetDate: YYYY-MM-DD string for this page.
 * now: Date object (for nav labels Today/Yesterday).
 * selectedCountry: null for all-countries page, or country string for country page.
 * availableDates: all available dates (for date nav prev/next).
 * availableDatesByCountry: Map<country, string[]> used for country dropdown dates.
 */
export function buildNewspaperDayModel(itemsForDate, targetDate, now, selectedCountry, availableDates, availableDatesByCountry, { navItems } = {}) {
  const depth = selectedCountry === null ? 1 : 2;
  const dateHrefBase = "../".repeat(depth);

  // On country pages use only dates available for that country so prev/next nav
  // stays within the country's own date range instead of jumping to all-countries dates.
  const datesForNav = selectedCountry
    ? (availableDatesByCountry.get(selectedCountry) || [])
    : availableDates;
  const countryPath = selectedCountry ? encodeCountryForPath(selectedCountry) : "";

  const nav = buildDateNav(datesForNav, targetDate, now, countryPath);

  const sections = groupBySection(itemsForDate).map((section) => ({
    label: section.label,
    columns: distributeIntoColumns(section.items.map(toItem), 3),
    totalItems: section.items.length,
  }));

  const availableCountries = [...availableDatesByCountry.keys()].sort();
  const countryOptions = buildCountryOptions(
    availableCountries,
    targetDate,
    selectedCountry,
    availableDatesByCountry,
    dateHrefBase,
  );

  return {
    dateLabel: formatDayMonth(targetDate),
    currentDate: targetDate,
    selectedCountry,
    countryPath,
    cssHref: "/static/newspaper.css",
    dateHrefBase,
    nav,
    navItems,
    sections,
    countryOptions,
  };
}
