/** @jsxImportSource @kitajs/html */

import { escapeHtml, renderAboutHeaderLink, renderLayout } from "../renderers/layout.js";
import { CALENDAR_TIME_SCRIPT_HREF } from "../renderAssets.js";
import { buildPrimaryNavItems } from "../siteNav.js";
import { renderPageHeaderShell, type NavItems, type RecordLike } from "./pageHelpers.js";

const renderLayoutShell = renderLayout as (props: { title: string; body: string; scriptHrefs?: string[] }) => string;

// The calendar page renderer stays focused on HTML structure and never derives
// timezone logic or ICS rules on its own.
export function renderCalendarPageTsx(model: RecordLike) {
  const navItems = (model.navItems as NavItems | undefined) ?? buildPrimaryNavItems("Calendar");
  const body = [
    renderPageHeaderShell({
      title: model.pageTitle || "Calendar",
      titleClass: "home-hero-title",
      headerClass: "page-header--wide page-header--compact",
      introHtml: `<p class="muted">${renderAboutHeaderLink()} <span>• ${escapeHtml((model.pageIntro as string) || "Upcoming events from local ICS feeds.")}</span></p>`,
      navItems,
      navClass: "page-nav--wide page-nav--compact",
    }),
    renderCalendarShell(model),
  ].join("");

  return renderLayoutShell({
    title: model.pageTitle || "Calendar",
    body,
    scriptHrefs: [CALENDAR_TIME_SCRIPT_HREF],
  });
}

function renderCalendarShell(model: RecordLike) {
  return `<section class="calendar-shell page-shell-wide" data-calendar-events-path="/calendar/events.json" data-calendar-fallback-month="${escapeHtml((model.selectedMonth as string) || "")}">
    <div class="calendar-month-switcher" data-calendar-month-switcher="true" aria-label="Calendar month navigation">
      <div class="calendar-month-switcher-side calendar-month-switcher-side--left">
        ${renderMonthNavLink(model.previousMonthLabel as string | null | undefined, model.previousMonthHref as string | null | undefined)}
      </div>
      <h2 class="calendar-month-current">${escapeHtml((model.selectedMonthLabel as string) || "")}</h2>
      <div class="calendar-month-switcher-side calendar-month-switcher-side--right">
        ${renderMonthNavLink(model.nextMonthLabel as string | null | undefined, model.nextMonthHref as string | null | undefined)}
      </div>
    </div>
    <div class="calendar-columns" data-calendar-columns="true">
      ${renderDateSections((model.dateSections as RecordLike[]) || [])}
    </div>
  </section>`;
}

function renderMonthNavLink(label: string | null | undefined, href: string | null | undefined) {
  if (!label || !href) {
    return "";
  }

  return `<a class="calendar-month-link" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

function renderDateSections(sections: RecordLike[]) {
  if (!sections.length) {
    return '<p class="muted calendar-empty-state">No events scheduled for this month.</p>';
  }

  return sections.map((section) => `<section class="calendar-date-column">
      <h3 class="calendar-date-band">${renderDateBandLabel((section.dateLabel as string) || "")}</h3>
      <div class="calendar-date-events">
        ${renderDayEvents((section.events as RecordLike[]) || [])}
      </div>
    </section>`).join("");
}

// Date bands render as two explicit units so narrow layouts can always stack
// the weekday line above the month/day line without relying on browser wraps.
function renderDateBandLabel(label: string) {
  const [weekday, rest] = String(label).split("/", 2);
  if (!rest) {
    return escapeHtml(label);
  }

  return `<span class="calendar-date-band-weekday">${escapeHtml(weekday)}/</span><span class="calendar-date-band-date">${escapeHtml(rest)}</span>`;
}

function renderDayEvents(events: RecordLike[]) {
  if (!events.length) {
    return '<p class="muted calendar-empty-state">No events on this date.</p>';
  }

  return events.map((event) => {
    const metaBits = [
      event.timeLabel ? `<span class="calendar-event-time">${escapeHtml(event.timeLabel as string)}</span>` : "",
    ].filter(Boolean).join("");
    const sourceMeta = renderEventSourceMeta(event);

    const description = event.description
      ? `<p class="calendar-event-description">${escapeHtml(event.description as string).replaceAll("\n", "<br />")}</p>`
      : "";

    const heading = event.url
      ? `<h4 class="calendar-event-title"><a href="${escapeHtml(event.url as string)}">${escapeHtml((event.summary as string) || "Untitled event")}</a></h4>`
      : `<h4 class="calendar-event-title">${escapeHtml((event.summary as string) || "Untitled event")}</h4>`;

    return `<article class="calendar-event">
      ${heading}
      ${metaBits ? `<div class="calendar-event-meta">${metaBits}</div>` : ""}
      ${sourceMeta}
      ${description}
    </article>`;
  }).join("");
}

// Calendar identity should come from curated source metadata, not raw ICS
// location strings that often contain TBD placeholders or mailing artifacts.
function renderEventSourceMeta(event: RecordLike) {
  const flagHtml = event.countryFlag && event.countryName
    ? `<span title="${escapeHtml(event.countryName as string)}">${event.countryFlag as string}</span>`
    : (event.countryFlag as string | undefined) || "";
  const parts = [
    flagHtml,
    event.hackerspaceName ? escapeHtml(event.hackerspaceName as string) : "",
  ].filter(Boolean);

  if (!parts.length) {
    return "";
  }

  return `<p class="calendar-event-source">${parts.join(" · ")}</p>`;
}
