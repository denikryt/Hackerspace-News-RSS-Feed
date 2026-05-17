import { buildCalendarIndex, buildEmptyCalendarIndex } from "./buildCalendarIndex.js";
import {
  formatDateKeyInTimeZone,
  formatLongDateLabel,
  formatMonthLabel,
} from "./dateFormatting.js";

// Calendar page models are now built from a month/date index. The old
// build-from-events entrypoint stays as a thin wrapper for compatibility and
// for tests that still exercise the pure page-model contract directly.
export function buildCalendarPageModel(events, options = {}) {
  const timeZone = options.timeZone || "UTC";
  const index = buildCalendarIndex(Array.isArray(events) ? events : [], { timeZone });
  return buildCalendarPageModelFromIndex(index, options);
}

// Render consumes a persisted refresh artifact, so this builder accepts a
// precomputed index and resolves only month selection and navigation.
export function buildCalendarPageModelFromIndex(calendarIndex, {
  timeZone = "UTC",
  selectedDate,
  selectedMonth,
  now = new Date(),
} = {}) {
  const normalizedIndex = normalizeCalendarIndex(calendarIndex, timeZone);
  const filterOptions = buildFilterOptions(normalizedIndex);
  const availableDates = listAvailableDates(normalizedIndex);
  const availableMonthsWithEvents = Array.isArray(normalizedIndex.availableMonthsWithEvents)
    ? normalizedIndex.availableMonthsWithEvents
    : [];
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
    availableCountries: filterOptions.availableCountries,
    availableHackerspaces: filterOptions.availableHackerspaces,
    selectedCountry: "all",
    selectedHackerspace: "all",
    dateSections: buildDateSections({ calendarIndex: normalizedIndex, monthKey: resolvedMonth }),
    selectedDayEvents: normalizedIndex.months?.[resolvedDate.slice(0, 7)]?.dates?.[resolvedDate]?.events || [],
  };
}

function normalizeCalendarIndex(calendarIndex, timeZone) {
  if (!calendarIndex || typeof calendarIndex !== "object") {
    return buildEmptyCalendarIndex({ timeZone });
  }

  return {
    ...buildEmptyCalendarIndex({ timeZone }),
    ...calendarIndex,
    months: calendarIndex.months && typeof calendarIndex.months === "object" ? calendarIndex.months : {},
    availableMonthsWithEvents: Array.isArray(calendarIndex.availableMonthsWithEvents)
      ? calendarIndex.availableMonthsWithEvents
      : [],
  };
}

function listAvailableDates(calendarIndex) {
  return Object.values(calendarIndex.months || {})
    .flatMap((month) => Object.keys(month?.dates || {}))
    .sort((left, right) => left.localeCompare(right));
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

// Filter controls should reflect the curated metadata carried by the full
// calendar payload, not only the currently selected month.
function buildFilterOptions(calendarIndex) {
  const countries = new Set();
  const hackerspaces = new Set();

  for (const event of listAllIndexedEvents(calendarIndex)) {
    if (typeof event?.countryName === "string" && event.countryName.trim() !== "") {
      countries.add(event.countryName.trim());
    }

    if (typeof event?.hackerspaceName === "string" && event.hackerspaceName.trim() !== "") {
      hackerspaces.add(event.hackerspaceName.trim());
    }
  }

  return {
    availableCountries: [...countries].sort((left, right) => left.localeCompare(right)),
    availableHackerspaces: [...hackerspaces].sort((left, right) => left.localeCompare(right)),
  };
}

function listAllIndexedEvents(calendarIndex) {
  return Object.values(calendarIndex.months || {})
    .flatMap((month) => Object.values(month?.dates || {}))
    .flatMap((dateBucket) => Array.isArray(dateBucket?.events) ? dateBucket.events : []);
}

// The renderer expects only eventful dates for the current month, so the page
// model flattens one month bucket into an ordered array of editorial columns.
function buildDateSections({ calendarIndex, monthKey }) {
  const monthBucket = calendarIndex.months?.[monthKey];
  if (!monthBucket || typeof monthBucket !== "object") {
    return [];
  }

  return Object.keys(monthBucket.dates || {})
    .sort((left, right) => left.localeCompare(right))
    .map((dateKey) => ({
      date: dateKey,
      dateLabel: monthBucket.dates[dateKey].dateLabel,
      events: monthBucket.dates[dateKey].events || [],
    }));
}
