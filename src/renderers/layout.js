import { SITE_CSS_HREF } from "../renderAssets.js";
import { getAboutHref } from "../sitePaths.js";
import { renderPageHeaderTsx } from "./tsxSharedRuntime.js";

export function renderLayout({ title, body, scriptHrefs = [] }) {
  const scriptsHtml = [...new Set(scriptHrefs)]
    .map((scriptHref) => `    <script src="${escapeHtml(scriptHref)}"></script>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <link rel="icon" href="/favicon.png" type="image/png" />
    <link rel="stylesheet" href="${escapeHtml(SITE_CSS_HREF)}" />
  </head>
  <body>
    <main>
      ${body}
    </main>
${scriptsHtml ? `${scriptsHtml}\n` : ""}  </body>
</html>`;
}

export function renderPageHeader({
  title,
  titleClass = "",
  introHtml = "",
  headerClass = "",
  navItems = [],
  navClass = "",
}) {
  // Shared page headers now render through the TSX-backed production helper so
  // the HTML contract stays stable while the implementation becomes structured.
  return renderPageHeaderTsx({
    title,
    titleClass,
    introHtml,
    headerClass,
    navItems,
    navClass,
  });
}

export function renderMetric(label, value) {
  return `<div class="metric"><span class="muted">${escapeHtml(label)}:</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

export function renderAboutHeaderLink() {
  return `<a class="about-link-muted" href="${getAboutHref()}">About</a>`;
}

export function renderField(label, value) {
  if (!value) {
    return "";
  }
  return `<span><span class="field-label">${escapeHtml(label)}:</span> ${escapeHtml(String(value))}</span>`;
}

export function renderNav(items) {
  return `<nav class="section-nav">${items
    .map(
      (item) =>
        `<a href="${escapeHtml(item.href)}"${item.isCurrent ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`,
    )
    .join("")}</nav>`;
}

export function renderTimelineDate(value) {
  const formatted = formatDisplayDateParts(value);
  if (!formatted) {
    return `<div class="timeline-date">
      <span class="timeline-date-label">NO DATE</span>
    </div>`;
  }

  return `<div class="timeline-date">
    <span class="timeline-date-label">${escapeHtml(formatted.month)}</span>
    <span class="timeline-date-day">${escapeHtml(formatted.day)}</span>
    <span class="timeline-date-year">${escapeHtml(formatted.year)}</span>
  </div>`;
}

export function formatCompactDate(value) {
  const formatted = formatDisplayDateParts(value);
  if (!formatted) {
    return "";
  }

  return `${formatted.month} ${formatted.day}, ${formatted.year}`;
}

function formatDisplayDateParts(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return null;
  }

  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" })
    .format(parsed)
    .toUpperCase();
  const day = new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone: "UTC" }).format(parsed);
  const year = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "UTC" }).format(parsed);

  return { month, day, year };
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
