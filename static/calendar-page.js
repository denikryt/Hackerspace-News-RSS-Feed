// The calendar page upgrades the UTC fallback markup to the visitor's local
// timezone and keeps interaction state in the browser only.
(function calendarPageRuntime() {
  const root = document.getElementById("calendar-root");
  const eventsNode = document.getElementById("calendar-events-data");
  const initialStateNode = document.getElementById("calendar-initial-state");

  if (!root || !eventsNode || !initialStateNode) {
    return;
  }

  const events = safeParseJson(eventsNode.textContent, []);
  const initialState = safeParseJson(initialStateNode.textContent, {});
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const state = {
    selectedMonth: initialState.selectedMonth || root.dataset.selectedMonth || formatDateKey(new Date(), timeZone).slice(0, 7),
    selectedDate: initialState.selectedDate || root.dataset.selectedDate || formatDateKey(new Date(), timeZone),
  };

  root.addEventListener("click", (event) => {
    const navButton = event.target.closest("[data-calendar-nav]");
    if (navButton) {
      state.selectedMonth = shiftMonthKey(state.selectedMonth, navButton.getAttribute("data-calendar-nav") === "next" ? 1 : -1);
      state.selectedDate = `${state.selectedMonth}-01`;
      render();
      return;
    }

    const dayButton = event.target.closest("[data-calendar-day]");
    if (dayButton) {
      state.selectedDate = dayButton.getAttribute("data-calendar-day");
      state.selectedMonth = state.selectedDate.slice(0, 7);
      render();
    }
  });

  render();

  function render() {
    const model = buildCalendarPageModel(events, {
      timeZone,
      selectedDate: state.selectedDate,
      selectedMonth: state.selectedMonth,
      now: new Date(),
    });

    state.selectedDate = model.selectedDate;
    state.selectedMonth = model.selectedMonth;
    root.dataset.selectedDate = model.selectedDate;
    root.dataset.selectedMonth = model.selectedMonth;
    document.getElementById("calendar-month-label").textContent = model.selectedMonthLabel;
    document.getElementById("calendar-selected-date-label").textContent = model.selectedDateLabel;
    document.getElementById("calendar-grid").innerHTML = renderCalendarGrid(model);
    document.getElementById("calendar-selected-day-events").innerHTML = renderSelectedDayEvents(model.selectedDayEvents);
  }
})();

function safeParseJson(text, fallbackValue) {
  try {
    return JSON.parse(text || "");
  } catch {
    return fallbackValue;
  }
}

function buildCalendarPageModel(events, { timeZone, selectedDate, selectedMonth, now }) {
  const eventIndex = buildEventIndex(events, timeZone);
  const availableDates = [...eventIndex.keys()].sort((left, right) => left.localeCompare(right));
  const fallbackDate = formatDateKey(now, timeZone);
  const resolvedMonth = selectedDate
    ? selectedDate.slice(0, 7)
    : (selectedMonth || availableDates[0]?.slice(0, 7) || fallbackDate.slice(0, 7));
  const resolvedDate = selectedDate
    || availableDates.find((dateKey) => dateKey.startsWith(`${resolvedMonth}-`))
    || (fallbackDate.startsWith(`${resolvedMonth}-`) ? fallbackDate : `${resolvedMonth}-01`);

  return {
    selectedDate: resolvedDate,
    selectedDateLabel: formatLongDateLabel(resolvedDate, timeZone),
    selectedMonth: resolvedMonth,
    selectedMonthLabel: formatMonthLabel(resolvedMonth),
    weekDayLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    weeks: buildMonthWeeks(resolvedMonth, eventIndex, resolvedDate),
    selectedDayEvents: (eventIndex.get(resolvedDate) || []).map((entry) => toVisibleDayEvent(entry.event, timeZone, resolvedDate)),
  };
}

function buildEventIndex(events, timeZone) {
  const index = new Map();

  for (const event of events || []) {
    const visibleDates = listVisibleDatesForEvent(event, timeZone);
    for (const visibleDate of visibleDates) {
      if (!index.has(visibleDate)) {
        index.set(visibleDate, []);
      }
      index.get(visibleDate).push({ visibleDate, event });
    }
  }

  for (const entries of index.values()) {
    entries.sort((left, right) => {
      const leftSortKey = left.event.startInstant || `${left.event.sourceDate || ""}T00:00:00.000Z`;
      const rightSortKey = right.event.startInstant || `${right.event.sourceDate || ""}T00:00:00.000Z`;
      return leftSortKey === rightSortKey
        ? (left.event.summary || "").localeCompare(right.event.summary || "")
        : leftSortKey.localeCompare(rightSortKey);
    });
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

  const startDateKey = formatDateKey(event.startInstant, timeZone);
  const endDateKey = formatDateKey(event.endInstant || event.startInstant, timeZone);
  return listDateKeysBetween(startDateKey, endDateKey);
}

function buildMonthWeeks(monthKey, eventIndex, selectedDate) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekdayOffset = (firstOfMonth.getUTCDay() + 6) % 7;
  const firstVisibleDate = new Date(Date.UTC(year, month - 1, 1 - firstWeekdayOffset));
  const weeks = [];

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const week = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const currentDate = new Date(firstVisibleDate.getTime() + ((weekIndex * 7) + dayIndex) * DAY_MS);
      const dateKey = currentDate.toISOString().slice(0, 10);
      week.push({
        date: dateKey,
        dayNumber: currentDate.getUTCDate(),
        isCurrentMonth: dateKey.startsWith(`${monthKey}-`),
        isSelected: dateKey === selectedDate,
        hasEvents: eventIndex.has(dateKey),
      });
    }

    weeks.push(week);
  }

  return weeks;
}

function toVisibleDayEvent(event, timeZone, visibleDate) {
  return {
    summary: event.summary || "Untitled event",
    dateLabel: formatLongDateLabel(visibleDate, timeZone),
    timeLabel: formatEventTimeLabel(event, timeZone),
    location: event.location || null,
    description: event.description || null,
    url: event.url || null,
    categories: event.categories || [],
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
  const startTime = formatTimeLabel(startDate, timeZone);

  if (!endDate) {
    return startTime;
  }

  const endTime = formatTimeLabel(endDate, timeZone);
  if (startDateKey === endDateKey) {
    return `${startTime} - ${endTime}`;
  }

  return `${formatMediumDateLabel(startDateKey)} ${startTime} - ${formatMediumDateLabel(endDateKey)} ${endTime}`;
}

function formatDateKey(value, timeZone) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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

function formatMediumDateLabel(dateKey) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}

function formatTimeLabel(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function shiftMonthKey(monthKey, delta) {
  const [year, month] = monthKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return shifted.toISOString().slice(0, 7);
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

function renderCalendarGrid(model) {
  const weekDays = model.weekDayLabels.map((label) => `<div class="calendar-weekday">${escapeHtml(label)}</div>`).join("");
  const weeks = model.weeks.map((week) =>
    week.map((day) => {
      const classNames = [
        "calendar-day",
        day.isCurrentMonth ? "" : "is-outside-month",
        day.isSelected ? "is-selected" : "",
        day.hasEvents ? "has-events" : "",
      ].filter(Boolean).join(" ");
      return `<button type="button" class="${classNames}" data-calendar-day="${escapeHtml(day.date)}" data-date="${escapeHtml(day.date)}" aria-pressed="${day.isSelected ? "true" : "false"}"><span class="calendar-day-number">${escapeHtml(String(day.dayNumber))}</span>${day.hasEvents ? '<span class="calendar-day-marker" aria-hidden="true"></span>' : ""}</button>`;
    }).join(""),
  ).join("");

  return `${weekDays}${weeks}`;
}

function renderSelectedDayEvents(events) {
  if (!events.length) {
    return '<p class="muted calendar-empty-state">No events on this day.</p>';
  }

  return events.map((event) => {
    const metaBits = [
      event.timeLabel ? `<span class="calendar-event-time">${escapeHtml(event.timeLabel)}</span>` : "",
      event.location ? `<span class="calendar-event-location">${escapeHtml(event.location)}</span>` : "",
      event.organizer ? `<span class="calendar-event-organizer">${escapeHtml(event.organizer)}</span>` : "",
    ].filter(Boolean).join("");
    const categories = (event.categories || []).length
      ? `<p class="calendar-event-categories">${event.categories.map((category) => `<span class="calendar-tag">${escapeHtml(category)}</span>`).join("")}</p>`
      : "";
    const description = event.description
      ? `<p class="calendar-event-description">${escapeHtml(event.description).replaceAll("\n", "<br />")}</p>`
      : "";
    const heading = event.url
      ? `<h4 class="calendar-event-title"><a href="${escapeHtml(event.url)}">${escapeHtml(event.summary || "Untitled event")}</a></h4>`
      : `<h4 class="calendar-event-title">${escapeHtml(event.summary || "Untitled event")}</h4>`;

    return `<article class="calendar-event">${heading}<p class="muted calendar-event-date">${escapeHtml(event.dateLabel || "")}</p>${metaBits ? `<div class="calendar-event-meta">${metaBits}</div>` : ""}${categories}${description}</article>`;
  }).join("");
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
