import {
  formatDateBandLabel,
  formatDateKeyInTimeZone,
  formatLongDateLabel,
  formatMediumDateLabel,
  formatMonthLabel,
  formatTimeLabel,
} from "./dateFormatting.js";

// The calendar page model is pure and timezone-aware so the same rules can be
// applied for server fallback rendering and for client-side reformatting.
export function buildCalendarPageModel(events, {
  timeZone = "UTC",
  selectedDate,
  selectedMonth,
  now = new Date(),
} = {}) {
  const normalizedEvents = Array.isArray(events) ? events : [];
  const eventIndex = buildEventIndex(normalizedEvents, timeZone);
  const availableDates = [...eventIndex.keys()].sort((left, right) => left.localeCompare(right));
  const availableMonthsWithEvents = listAvailableMonthsWithEvents(availableDates);
  const fallbackDate = formatDateKeyInTimeZone(now, timeZone);
  const resolvedMonth = resolveSelectedMonth({ fallbackDate, selectedDate, selectedMonth });
  const resolvedDate = resolveSelectedDate({ availableDates, fallbackDate, selectedDate, resolvedMonth });
  const monthNavigation = resolveMonthNavigation(availableMonthsWithEvents, resolvedMonth);

  return {
    pageTitle: "Calendar",
    pageIntro: "Upcoming events from local ICS files.",
    selectedDate: resolvedDate,
    selectedDateLabel: formatLongDateLabel(resolvedDate, timeZone),
    selectedMonth: resolvedMonth,
    selectedMonthLabel: formatMonthLabel(resolvedMonth),
    previousMonth: monthNavigation.previousMonth,
    previousMonthLabel: monthNavigation.previousMonth ? formatMonthLabel(monthNavigation.previousMonth) : null,
    nextMonth: monthNavigation.nextMonth,
    nextMonthLabel: monthNavigation.nextMonth ? formatMonthLabel(monthNavigation.nextMonth) : null,
    availableMonthsWithEvents,
    dateSections: buildDateSections({ monthKey: resolvedMonth, eventIndex, timeZone }),
    selectedDayEvents: (eventIndex.get(resolvedDate) || []).map((entry) => toVisibleDayEvent(entry.event, timeZone, resolvedDate)),
  };
}

// Timed events are indexed by the day they occupy in the target timezone,
// while date-only events stay pinned to their original source day.
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

function resolveSelectedMonth({ fallbackDate, selectedDate, selectedMonth }) {
  if (selectedDate) {
    return selectedDate.slice(0, 7);
  }
  if (selectedMonth) {
    return selectedMonth;
  }
  return fallbackDate.slice(0, 7);
}

function resolveSelectedDate({ availableDates, fallbackDate, selectedDate, resolvedMonth }) {
  if (selectedDate) {
    return selectedDate;
  }

  if (fallbackDate.startsWith(`${resolvedMonth}-`)) {
    return fallbackDate;
  }

  const firstAvailableDateInMonth = availableDates.find((dateKey) => dateKey.startsWith(`${resolvedMonth}-`));
  if (firstAvailableDateInMonth) {
    return firstAvailableDateInMonth;
  }

  return `${resolvedMonth}-01`;
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

  const startDateKey = formatDateKeyInTimeZone(event.startInstant, timeZone);
  const endDateKey = formatDateKeyInTimeZone(event.endInstant || event.startInstant, timeZone);
  return listDateKeysBetween(startDateKey, endDateKey);
}

function toVisibleDayEvent(event, timeZone, visibleDate) {
  return {
    uid: event.uid,
    summary: event.summary || "Untitled event",
    dateLabel: formatLongDateLabel(visibleDate, timeZone),
    timeLabel: formatEventTimeLabel(event, timeZone),
    location: event.location || null,
    description: event.description || null,
    url: event.url || null,
    categories: event.categories || [],
    organizer: event.organizer || null,
    sourceFile: event.sourceFile || null,
  };
}

function formatEventTimeLabel(event, timeZone) {
  if (!event || event.dateKind === "date" || !event.startInstant) {
    return "All day";
  }

  const startDate = new Date(event.startInstant);
  const endDate = event.endInstant ? new Date(event.endInstant) : null;
  const startDateKey = formatDateKeyInTimeZone(startDate, timeZone);
  const endDateKey = endDate ? formatDateKeyInTimeZone(endDate, timeZone) : startDateKey;
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

function listDateKeysBetween(startDateKey, endDateKey) {
  const dates = [];
  const start = new Date(`${startDateKey}T00:00:00.000Z`);
  const end = new Date(`${endDateKey}T00:00:00.000Z`);

  for (let current = start.getTime(); current <= end.getTime(); current += DAY_MS) {
    dates.push(new Date(current).toISOString().slice(0, 10));
  }

  return dates;
}

function compareIndexedEvents(left, right) {
  const leftSortKey = left.event.startInstant || `${left.event.sourceDate || ""}T00:00:00.000Z`;
  const rightSortKey = right.event.startInstant || `${right.event.sourceDate || ""}T00:00:00.000Z`;

  if (leftSortKey !== rightSortKey) {
    return leftSortKey.localeCompare(rightSortKey);
  }

  return (left.event.summary || "").localeCompare(right.event.summary || "");
}

function listAvailableMonthsWithEvents(availableDates) {
  return [...new Set(availableDates.map((dateKey) => dateKey.slice(0, 7)))];
}

function resolveMonthNavigation(availableMonthsWithEvents, resolvedMonth) {
  const previousMonth = [...availableMonthsWithEvents]
    .reverse()
    .find((monthKey) => monthKey < resolvedMonth) || null;
  const nextMonth = availableMonthsWithEvents.find((monthKey) => monthKey > resolvedMonth) || null;

  return {
    previousMonth,
    nextMonth,
  };
}

// The static calendar page renders one editorial column per eventful day, so
// this model filters out every empty date before the renderer sees it.
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

const DAY_MS = 24 * 60 * 60 * 1000;
