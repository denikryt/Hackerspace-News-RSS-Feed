import { buildCalendarIndex, buildEmptyCalendarIndex, toVisibleDayEvent } from "./buildCalendarIndex.js";
import { formatDateKeyInTimeZone, formatLongDateLabel, formatMonthLabel, } from "./dateFormatting.js";
// Calendar page models are now built from a month/date index. The old
// build-from-events entrypoint stays as a thin wrapper for compatibility and
// for tests that still exercise the pure page-model contract directly.
export function buildCalendarPageModel(events, options = {}) {
    const timeZone = options.timeZone || "UTC";
    const index = buildCalendarIndex(Array.isArray(events) ? events : [], { timeZone, windowYear: new Date(options.now || Date.now()).getUTCFullYear() });
    return buildCalendarPageModelFromIndex(index, { ...options, events });
}
// Render consumes a persisted refresh artifact, so this builder accepts a
// precomputed index and resolves only month selection and navigation.
export function buildCalendarPageModelFromIndex(calendarIndex, { timeZone = "UTC", events = [], selectedDate, selectedMonth, now = new Date(), } = {}) {
    const normalizedIndex = normalizeCalendarIndex(calendarIndex, timeZone);
    const filterOptions = buildFilterOptions(normalizedIndex, events);
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
        dateSections: buildDateSections({ calendarIndex: normalizedIndex, monthKey: resolvedMonth, events, timeZone }),
        selectedDayEvents: resolveDayEvents(normalizedIndex.months?.[resolvedDate.slice(0, 7)]?.dates?.[resolvedDate], events, timeZone, resolvedDate),
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
function buildFilterOptions(calendarIndex, events) {
    const countries = new Set();
    const hackerspaces = new Set();
    for (const ref of listAllIndexedEvents(calendarIndex)) {
        const event = { ...events[ref], countryName: events[ref]?.country };
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
function* listAllIndexedEvents(calendarIndex) {
    for (const month of Object.values(calendarIndex.months || {}))
        for (const bucket of Object.values(month.dates || {}))
            yield* bucket.eventIndexes || [];
}
// The renderer expects only eventful dates for the current month, so the page
// model flattens one month bucket into an ordered array of editorial columns.
function buildDateSections({ calendarIndex, monthKey, events, timeZone }) {
    const monthBucket = calendarIndex.months?.[monthKey];
    if (!monthBucket || typeof monthBucket !== "object") {
        return [];
    }
    return Object.keys(monthBucket.dates || {})
        .sort((left, right) => left.localeCompare(right))
        .map((dateKey) => ({
        date: dateKey,
        dateLabel: monthBucket.dates[dateKey].dateLabel,
        events: resolveDayEvents(monthBucket.dates[dateKey], events, timeZone, dateKey),
    }));
}
// Materialize only the selected month, resolving each positional reference.
function resolveDayEvents(bucket, events, timeZone, date) {
    return (bucket?.eventIndexes || []).map(ref => {
        const { _sortKey, ...visibleEvent } = toVisibleDayEvent(events[ref], timeZone, date);
        return visibleEvent;
    });
}
