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
  const fallbackDate = formatDateKey(now, timeZone);
  const resolvedMonth = resolveSelectedMonth({ availableDates, fallbackDate, selectedDate, selectedMonth });
  const resolvedDate = resolveSelectedDate({ availableDates, fallbackDate, selectedDate, resolvedMonth });

  return {
    pageTitle: "Calendar",
    pageIntro: "Upcoming events from local ICS files.",
    selectedDate: resolvedDate,
    selectedDateLabel: formatLongDateLabel(resolvedDate, timeZone),
    selectedMonth: resolvedMonth,
    selectedMonthLabel: formatMonthLabel(resolvedMonth),
    weekDayLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    weeks: buildMonthWeeks(resolvedMonth, eventIndex, resolvedDate),
    selectedDayEvents: (eventIndex.get(resolvedDate) || []).map((entry) => toVisibleDayEvent(entry.event, timeZone, resolvedDate)),
    serializedEventsJson: JSON.stringify(normalizedEvents),
    serializedInitialStateJson: JSON.stringify({ selectedDate: resolvedDate, selectedMonth: resolvedMonth }),
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

function resolveSelectedMonth({ availableDates, fallbackDate, selectedDate, selectedMonth }) {
  if (selectedDate) {
    return selectedDate.slice(0, 7);
  }
  if (selectedMonth) {
    return selectedMonth;
  }
  if (availableDates.length > 0) {
    return availableDates[0].slice(0, 7);
  }
  return fallbackDate.slice(0, 7);
}

function resolveSelectedDate({ availableDates, fallbackDate, selectedDate, resolvedMonth }) {
  if (selectedDate) {
    return selectedDate;
  }

  const firstAvailableDateInMonth = availableDates.find((dateKey) => dateKey.startsWith(`${resolvedMonth}-`));
  if (firstAvailableDateInMonth) {
    return firstAvailableDateInMonth;
  }

  if (fallbackDate.startsWith(`${resolvedMonth}-`)) {
    return fallbackDate;
  }

  return `${resolvedMonth}-01`;
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
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function formatLongDateLabel(dateKey, timeZone) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatMediumDateLabel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatMonthLabel(monthKey) {
  const date = new Date(`${monthKey}-01T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTimeLabel(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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

const DAY_MS = 24 * 60 * 60 * 1000;
