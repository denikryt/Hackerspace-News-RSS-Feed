// Calendar pages ship with fully rendered server HTML as a crawler-friendly
// fallback. When JavaScript is available, the browser rebuilds the month body
// from absolute instants so day columns and time labels use one timezone.
(async function enhanceCalendarPage() {
  const shell = document.querySelector(".calendar-shell");
  if (!shell) {
    return;
  }

  const eventsPath = shell.getAttribute("data-calendar-events-path");
  const fallbackMonth = shell.getAttribute("data-calendar-fallback-month");
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!eventsPath || !timeZone) {
    return;
  }

  let payload;
  try {
    const response = await fetch(eventsPath);
    if (!response.ok) {
      return;
    }

    payload = await response.json();
  } catch {
    return;
  }

  const now = new Date();
  const selectedMonth = resolveSelectedMonth({
    pathname: window.location.pathname,
    fallbackMonth,
    timeZone,
    now,
  });
  const model = buildClientCalendarModel({
    events: Array.isArray(payload?.events) ? payload.events : [],
    selectedMonth,
    timeZone,
    now,
  });

  shell.innerHTML = renderCalendarShell(model);
})();

// Timed events regroup by the client's timezone, while date-only events stay
// pinned to their source day to avoid accidental day drift.
function buildClientCalendarModel({ events, selectedMonth, timeZone, now }) {
  const eventIndex = buildEventIndex(events, timeZone);
  const availableDates = [...eventIndex.keys()].sort((left, right) => left.localeCompare(right));
  const availableMonthsWithEvents = [...new Set(availableDates.map((dateKey) => dateKey.slice(0, 7)))];
  const currentMonth = formatMonthKey(now, timeZone);
  const monthNavigation = resolveMonthNavigation(availableMonthsWithEvents, selectedMonth);

  return {
    selectedMonth,
    selectedMonthLabel: formatMonthLabel(selectedMonth),
    currentMonth,
    previousMonth: monthNavigation.previousMonth,
    nextMonth: monthNavigation.nextMonth,
    dateSections: buildDateSections({ monthKey: selectedMonth, eventIndex, timeZone }),
  };
}

function renderCalendarShell(model) {
  return `<div class="calendar-month-switcher" data-calendar-month-switcher="true" aria-label="Calendar month navigation">
      <div class="calendar-month-switcher-side calendar-month-switcher-side--left">
        ${renderMonthNavLink(model.previousMonth, model.currentMonth)}
      </div>
      <h2 class="calendar-month-current">${escapeHtml(model.selectedMonthLabel)}</h2>
      <div class="calendar-month-switcher-side calendar-month-switcher-side--right">
        ${renderMonthNavLink(model.nextMonth, model.currentMonth)}
      </div>
    </div>
    <div class="calendar-columns" data-calendar-columns="true">
      ${renderDateSections(model.dateSections)}
    </div>`;
}

function renderMonthNavLink(monthKey, currentMonth) {
  if (!monthKey) {
    return "";
  }

  const href = monthKey === currentMonth ? "/calendar/" : `/calendar/${monthKey}/`;
  return `<a class="calendar-month-link" href="${escapeHtml(href)}">${escapeHtml(formatMonthLabel(monthKey))}</a>`;
}

function renderDateSections(sections) {
  if (!sections.length) {
    return '<p class="muted calendar-empty-state">No events scheduled for this month.</p>';
  }

  return sections.map((section) => `<section class="calendar-date-column">
      <h3 class="calendar-date-band">${escapeHtml(section.dateLabel)}</h3>
      <div class="calendar-date-events">
        ${renderDayEvents(section.events)}
      </div>
    </section>`).join("");
}

function renderDayEvents(events) {
  return events.map((event) => {
    const metaBits = [
      event.timeLabel ? `<span class="calendar-event-time">${escapeHtml(event.timeLabel)}</span>` : "",
      event.location ? `<span class="calendar-event-location">${escapeHtml(event.location)}</span>` : "",
      event.organizer ? `<span class="calendar-event-organizer">${escapeHtml(event.organizer)}</span>` : "",
    ].filter(Boolean).join("");

    const description = event.description
      ? `<p class="calendar-event-description">${escapeHtml(event.description).replaceAll("\n", "<br />")}</p>`
      : "";

    const heading = event.url
      ? `<h4 class="calendar-event-title"><a href="${escapeHtml(event.url)}">${escapeHtml(event.summary || "Untitled event")}</a></h4>`
      : `<h4 class="calendar-event-title">${escapeHtml(event.summary || "Untitled event")}</h4>`;

    return `<article class="calendar-event">
      ${heading}
      ${metaBits ? `<div class="calendar-event-meta">${metaBits}</div>` : ""}
      ${description}
    </article>`;
  }).join("");
}

function buildDateSections({ monthKey, eventIndex, timeZone }) {
  return [...eventIndex.entries()]
    .filter(([dateKey]) => dateKey.startsWith(`${monthKey}-`))
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([dateKey, entries]) => ({
      date: dateKey,
      dateLabel: formatDateBandLabel(dateKey, timeZone),
      events: entries.map((entry) => toVisibleDayEvent(entry.event, timeZone, dateKey)),
    }));
}

function buildEventIndex(events, timeZone) {
  const index = new Map();

  for (const event of events) {
    const visibleDates = listVisibleDatesForEvent(event, timeZone);
    for (const visibleDate of visibleDates) {
      if (!index.has(visibleDate)) {
        index.set(visibleDate, []);
      }
      index.get(visibleDate).push({ visibleDate, event });
    }
  }

  for (const entries of index.values()) {
    entries.sort(compareIndexedEvents);
  }

  return index;
}

function listVisibleDatesForEvent(event, timeZone) {
  if (!event) {
    return [];
  }

  if (event.dateKind === "date") {
    return event.sourceDate ? [event.sourceDate] : [];
  }

  if (!event.startInstant) {
    return [];
  }

  const startDateKey = formatDateKey(new Date(event.startInstant), timeZone);
  const endDateKey = formatDateKey(new Date(event.endInstant || event.startInstant), timeZone);
  return listDateKeysBetween(startDateKey, endDateKey);
}

function listDateKeysBetween(startDateKey, endDateKey) {
  const dates = [];
  const start = new Date(`${startDateKey}T00:00:00.000Z`);
  const end = new Date(`${endDateKey}T00:00:00.000Z`);

  for (let current = start.getTime(); current <= end.getTime(); current += DAY_MS) {
    dates.push(new Date(current).toISOString().slice(0, 10));
  }

  return dates;
}

function toVisibleDayEvent(event, timeZone, visibleDate) {
  return {
    summary: event.summary || "Untitled event",
    dateLabel: formatLongDateLabel(visibleDate, timeZone),
    timeLabel: formatEventTimeLabel(event, timeZone),
    location: event.location || null,
    description: event.description || null,
    url: event.url || null,
    organizer: event.organizer || null,
  };
}

function formatEventTimeLabel(event, timeZone) {
  if (!event || event.dateKind === "date" || !event.startInstant) {
    return "All day";
  }

  const startDate = new Date(event.startInstant);
  const endDate = event.endInstant ? new Date(event.endInstant) : null;
  const startDateKey = formatDateKey(startDate, timeZone);
  const endDateKey = endDate ? formatDateKey(endDate, timeZone) : startDateKey;
  const startTime = formatTime(startDate, timeZone);

  if (!endDate || Number.isNaN(endDate.getTime())) {
    return startTime;
  }

  const endTime = formatTime(endDate, timeZone);
  if (startDateKey === endDateKey) {
    return `${startTime} - ${endTime}`;
  }

  return `${formatShortDate(startDate, timeZone)} ${startTime} - ${formatShortDate(endDate, timeZone)} ${endTime}`;
}

function compareIndexedEvents(left, right) {
  const leftSortKey = left.event.startInstant || `${left.event.sourceDate || ""}T00:00:00.000Z`;
  const rightSortKey = right.event.startInstant || `${right.event.sourceDate || ""}T00:00:00.000Z`;

  if (leftSortKey !== rightSortKey) {
    return leftSortKey.localeCompare(rightSortKey);
  }

  return (left.event.summary || "").localeCompare(right.event.summary || "");
}

function resolveMonthNavigation(availableMonthsWithEvents, selectedMonth) {
  const previousMonth = [...availableMonthsWithEvents]
    .reverse()
    .find((monthKey) => monthKey < selectedMonth) || null;
  const nextMonth = availableMonthsWithEvents.find((monthKey) => monthKey > selectedMonth) || null;

  return {
    previousMonth,
    nextMonth,
  };
}

function resolveSelectedMonth({ pathname, fallbackMonth, timeZone, now }) {
  const monthMatch = pathname.match(/^\/calendar\/(\d{4}-\d{2})\/?$/);
  if (monthMatch) {
    return monthMatch[1];
  }

  if (pathname === "/calendar" || pathname === "/calendar/") {
    return formatMonthKey(now, timeZone);
  }

  return fallbackMonth || formatMonthKey(now, timeZone);
}

function formatMonthKey(value, timeZone) {
  return formatDateKey(value, timeZone).slice(0, 7);
}

function formatDateKey(value, timeZone) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatMonthLabel(monthKey) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${monthKey}-01T00:00:00.000Z`));
}

function formatLongDateLabel(dateKey, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}

function formatDateBandLabel(dateKey, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
    })
      .formatToParts(new Date(`${dateKey}T00:00:00.000Z`))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.weekday}/${parts.month} ${parts.day}`;
}

function formatShortDate(value, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(value);
}

function formatTime(value, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const DAY_MS = 24 * 60 * 60 * 1000;
