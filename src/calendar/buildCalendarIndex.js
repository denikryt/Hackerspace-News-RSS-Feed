import {
  formatDateBandLabel,
  formatDateKeyInTimeZone,
  formatLongDateLabel,
  formatMediumDateLabel,
  formatTimeLabel,
} from "./dateFormatting.js";
import { getCountryFlag } from "../countryFlags.js";

// The persisted calendar index is a refresh artifact. It pre-groups normalized
// events by visible fallback day so render can consume month slices directly.
export function buildCalendarIndex(events, {
  generatedAt = null,
  timeZone = "UTC",
} = {}) {
  const normalizedEvents = Array.isArray(events) ? events : [];
  const monthMap = new Map();

  for (const event of normalizedEvents) {
    for (const visibleDate of listVisibleDatesForEvent(event, timeZone)) {
      const monthKey = visibleDate.slice(0, 7);
      const monthBucket = ensureMonthBucket(monthMap, monthKey);
      const dateBucket = ensureDateBucket(monthBucket, visibleDate, timeZone);
      dateBucket.events.push(toVisibleDayEvent(event, timeZone, visibleDate));
    }
  }

  const availableMonthsWithEvents = [...monthMap.keys()].sort((left, right) => left.localeCompare(right));
  const months = Object.fromEntries(
    availableMonthsWithEvents.map((monthKey) => {
      const monthBucket = monthMap.get(monthKey);
      const sortedDateKeys = [...monthBucket.dates.keys()].sort((left, right) => left.localeCompare(right));
      const dates = Object.fromEntries(
        sortedDateKeys.map((dateKey) => {
          const dateBucket = monthBucket.dates.get(dateKey);
          dateBucket.events.sort(compareVisibleDayEvents);
          return [dateKey, {
            dateKey,
            dateLabel: dateBucket.dateLabel,
            events: dateBucket.events.map(stripInternalSortKey),
          }];
        }),
      );

      return [monthKey, {
        monthKey,
        dates,
      }];
    }),
  );

  return {
    generatedAt,
    timeZone,
    availableMonthsWithEvents,
    months,
  };
}

// Render keeps working without refresh artifacts, so an empty index still has
// the same stable shape as a populated one.
export function buildEmptyCalendarIndex({ generatedAt = null, timeZone = "UTC" } = {}) {
  return {
    generatedAt,
    timeZone,
    availableMonthsWithEvents: [],
    months: {},
  };
}

function ensureMonthBucket(monthMap, monthKey) {
  if (!monthMap.has(monthKey)) {
    monthMap.set(monthKey, { monthKey, dates: new Map() });
  }

  return monthMap.get(monthKey);
}

function ensureDateBucket(monthBucket, dateKey, timeZone) {
  if (!monthBucket.dates.has(dateKey)) {
    monthBucket.dates.set(dateKey, {
      dateKey,
      dateLabel: formatDateBandLabel(dateKey, timeZone),
      events: [],
    });
  }

  return monthBucket.dates.get(dateKey);
}

// Timed events occupy every visible fallback day they cross, while date-only
// events stay pinned to the source date from the ICS snapshot.
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

function listDateKeysBetween(startDateKey, endDateKey) {
  const dates = [];
  const start = new Date(`${startDateKey}T00:00:00.000Z`);
  const end = new Date(`${endDateKey}T00:00:00.000Z`);

  for (let current = start.getTime(); current <= end.getTime(); current += DAY_MS) {
    dates.push(new Date(current).toISOString().slice(0, 10));
  }

  return dates;
}

// Each visible event slice stores only the fields the server fallback calendar
// page actually renders. Raw event objects are intentionally not duplicated.
function toVisibleDayEvent(event, timeZone, visibleDate) {
  return {
    uid: event.uid,
    summary: event.summary || "Untitled event",
    dateLabel: formatLongDateLabel(visibleDate, timeZone),
    timeLabel: formatEventTimeLabel(event, timeZone),
    countryName: event.country || null,
    countryFlag: event.countryFlag || getCountryFlag(event.country),
    hackerspaceName: event.hackerspaceName || null,
    location: event.location || null,
    description: event.description || null,
    url: event.url || null,
    organizer: event.organizer || null,
    sourceFile: event.sourceFile || null,
    _sortKey: buildSortKey(event),
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

function compareVisibleDayEvents(left, right) {
  if (left._sortKey !== right._sortKey) {
    return left._sortKey.localeCompare(right._sortKey);
  }

  return (left.summary || "").localeCompare(right.summary || "");
}

function buildSortKey(event) {
  return event.startInstant || `${event.sourceDate || ""}T00:00:00.000Z`;
}

function stripInternalSortKey(event) {
  const { _sortKey, ...visibleEvent } = event;
  return visibleEvent;
}

const DAY_MS = 24 * 60 * 60 * 1000;
