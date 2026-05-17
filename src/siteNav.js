import {
  getAuthorsIndexHref,
  getCalendarHref,
  getCuratedHref,
  getHomeHref,
  getNewsIndexHref,
} from "./sitePaths.js";

// Shared site navigation stays centralized so page renderers do not drift when
// a primary section like Calendar is added to the global navbar.
export function buildPrimaryNavItems(currentSection) {
  return [
    { href: getHomeHref(), label: "Hackerspaces", isCurrent: currentSection === "Hackerspaces" },
    { href: getNewsIndexHref(), label: "News", isCurrent: currentSection === "News" },
    { href: getCuratedHref(), label: "Curated", isCurrent: currentSection === "Curated" },
    { href: getCalendarHref(), label: "Calendar", isCurrent: currentSection === "Calendar" },
    { href: getAuthorsIndexHref(), label: "Authors", isCurrent: currentSection === "Authors" },
  ];
}

// Feed-like pages own extra trail items, but the shared site sections still
// need to stay present in a stable order at the front of the navbar.
export function buildStreamNavItems({ homeHref = getHomeHref(), streamNavItems = [] } = {}) {
  const ensuredItems = ensureAuthorsItem(
    ensureCalendarItem(
      ensureCuratedItem(
        streamNavItems.length > 0
          ? streamNavItems
          : [{ href: getNewsIndexHref(), label: "News", isCurrent: true }],
      ),
    ),
  );

  return [
    { href: homeHref, label: "Hackerspaces" },
    ...ensuredItems,
  ];
}

function ensureCuratedItem(items) {
  if (items.some((item) => item.href === getCuratedHref())) {
    return items;
  }

  const result = [...items];
  const newsIndex = result.findIndex((item) => item.href === getNewsIndexHref());
  const insertIndex = newsIndex === -1 ? Math.min(1, result.length) : newsIndex + 1;
  result.splice(insertIndex, 0, { href: getCuratedHref(), label: "Curated", isCurrent: false });
  return result;
}

function ensureCalendarItem(items) {
  if (items.some((item) => item.href === getCalendarHref())) {
    return items;
  }

  const result = [...items];
  const curatedIndex = result.findIndex((item) => item.href === getCuratedHref());
  const newsIndex = result.findIndex((item) => item.href === getNewsIndexHref());
  const insertIndex = curatedIndex !== -1
    ? curatedIndex + 1
    : (newsIndex === -1 ? Math.min(1, result.length) : newsIndex + 1);
  result.splice(insertIndex, 0, { href: getCalendarHref(), label: "Calendar", isCurrent: false });
  return result;
}

function ensureAuthorsItem(items) {
  if (items.some((item) => item.href === getAuthorsIndexHref())) {
    return items;
  }

  return [...items, { href: getAuthorsIndexHref(), label: "Authors", isCurrent: false }];
}
