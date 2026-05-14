/** @jsxImportSource @kitajs/html */

import { CALENDAR_PAGE_SCRIPT_HREF } from "../renderAssets.js";
import { escapeHtml, renderAboutHeaderLink, renderLayout } from "../renderers/layout.js";
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
    `<script id="calendar-initial-state" type="application/json">${escapeInlineJson((model.serializedInitialStateJson as string) || "{}")}</script>`,
  ].join("");

  return renderLayoutShell({
    title: model.pageTitle || "Calendar",
    body,
    scriptHrefs: [CALENDAR_PAGE_SCRIPT_HREF],
  });
}

function renderCalendarShell(model: RecordLike) {
  return `<section id="calendar-root" class="calendar-shell page-shell-wide" data-selected-date="${escapeHtml((model.selectedDate as string) || "")}" data-selected-month="${escapeHtml((model.selectedMonth as string) || "")}" data-events-path="${escapeHtml((model.eventsPath as string) || "/calendar/events.json")}">
    <div class="calendar-panel">
      <div class="calendar-toolbar">
        <button type="button" class="calendar-month-button" data-calendar-nav="prev" aria-label="Previous month">Previous</button>
        <h2 id="calendar-month-label" class="calendar-month-label">${escapeHtml((model.selectedMonthLabel as string) || "")}</h2>
        <button type="button" class="calendar-month-button" data-calendar-nav="next" aria-label="Next month">Next</button>
      </div>
      <div id="calendar-grid" class="calendar-grid">
        ${renderCalendarGrid(model)}
      </div>
    </div>
    <aside class="calendar-day-panel">
      <h3 id="calendar-selected-date-label" class="calendar-day-title">${escapeHtml((model.selectedDateLabel as string) || "No day selected")}</h3>
      <div id="calendar-selected-day-events" class="calendar-day-events">
        ${renderSelectedDayEvents((model.selectedDayEvents as RecordLike[]) || [])}
      </div>
    </aside>
  </section>`;
}

function renderCalendarGrid(model: RecordLike) {
  const weekDayLabels = ((model.weekDayLabels as string[]) || []).map((label) =>
    `<div class="calendar-weekday">${escapeHtml(label)}</div>`,
  ).join("");

  const weeks = ((model.weeks as RecordLike[][]) || []).map((week) =>
    week.map((day) => renderCalendarDay(day)).join(""),
  ).join("");

  return `${weekDayLabels}${weeks}`;
}

function renderCalendarDay(day: RecordLike) {
  const classNames = [
    "calendar-day",
    day.isCurrentMonth ? "" : "is-outside-month",
    day.isSelected ? "is-selected" : "",
    day.hasEvents ? "has-events" : "",
  ].filter(Boolean).join(" ");

  return `<button type="button" class="${classNames}" data-calendar-day="${escapeHtml(day.date as string)}" data-date="${escapeHtml(day.date as string)}" aria-pressed="${day.isSelected ? "true" : "false"}">
    <span class="calendar-day-number">${escapeHtml(String(day.dayNumber || ""))}</span>
    ${day.hasEvents ? '<span class="calendar-day-marker" aria-hidden="true"></span>' : ""}
  </button>`;
}

function renderSelectedDayEvents(events: RecordLike[]) {
  if (!events.length) {
    return '<p class="muted calendar-empty-state">No events on this day.</p>';
  }

  return events.map((event) => {
    const metaBits = [
      event.timeLabel ? `<span class="calendar-event-time">${escapeHtml(event.timeLabel as string)}</span>` : "",
      event.location ? `<span class="calendar-event-location">${escapeHtml(event.location as string)}</span>` : "",
      event.organizer ? `<span class="calendar-event-organizer">${escapeHtml(event.organizer as string)}</span>` : "",
    ].filter(Boolean).join("");

    const categories = ((event.categories as string[]) || []).length
      ? `<p class="calendar-event-categories">${(event.categories as string[]).map((category) => `<span class="calendar-tag">${escapeHtml(category)}</span>`).join("")}</p>`
      : "";

    const description = event.description
      ? `<p class="calendar-event-description">${escapeHtml(event.description as string).replaceAll("\n", "<br />")}</p>`
      : "";

    const heading = event.url
      ? `<h4 class="calendar-event-title"><a href="${escapeHtml(event.url as string)}">${escapeHtml((event.summary as string) || "Untitled event")}</a></h4>`
      : `<h4 class="calendar-event-title">${escapeHtml((event.summary as string) || "Untitled event")}</h4>`;

    return `<article class="calendar-event">
      ${heading}
      <p class="muted calendar-event-date">${escapeHtml((event.dateLabel as string) || "")}</p>
      ${metaBits ? `<div class="calendar-event-meta">${metaBits}</div>` : ""}
      ${categories}
      ${description}
    </article>`;
  }).join("");
}

function escapeInlineJson(json: string) {
  return String(json)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}
