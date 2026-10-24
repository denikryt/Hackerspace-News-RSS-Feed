import { createHash } from "node:crypto";
import { calendarYearWindow, normalizeDateOnlyInterval } from "./normalizeCalendarSnapshot.js";
import { formatDateBandLabel, formatDateKeyInTimeZone, formatLongDateLabel, formatMediumDateLabel, formatTimeLabel, } from "./dateFormatting.js";
import { getCountryFlag } from "../countryFlags.js";
// The persisted calendar index is a refresh artifact. It pre-groups normalized
// events by visible fallback day so render can consume month slices directly.
export function buildCalendarIndex(events, { generatedAt = null, timeZone = "UTC", windowYear = new Date().getUTCFullYear() } = {}) {
    const normalizedEvents = Array.isArray(events) ? events : [];
    const window = calendarYearWindow(windowYear);
    const monthMap = new Map();
    for (const [eventIndex, event] of normalizedEvents.entries()) {
        for (const date of listVisibleDatesForEvent(event, timeZone, window)) {
            const month = ensureMonthBucket(monthMap, date.slice(0, 7));
            const bucket = ensureDateBucket(month, date, timeZone);
            bucket.events.push(eventIndex);
        }
    }
    const availableMonthsWithEvents = [...monthMap.keys()].sort();
    const months = Object.fromEntries(availableMonthsWithEvents.map(monthKey => [monthKey, { monthKey, dates: Object.fromEntries([...monthMap.get(monthKey).dates].sort(([a], [b]) => a.localeCompare(b)).map(([dateKey, bucket]) => [dateKey, { dateKey, dateLabel: bucket.dateLabel, eventIndexes: bucket.events.sort((a, b) => compareCanonicalEvents(normalizedEvents[a], normalizedEvents[b])) }])) }]));
    return { schemaVersion: 2, sourceEventsSha256: sourceEventsDigest(normalizedEvents), generatedAt, timeZone, ...window, availableMonthsWithEvents, months };
}
export function buildEmptyCalendarIndex(options = {}) { return buildCalendarIndex([], options); }
// Hash in canonical order: equal UID/content never merges distinct positions.
export function sourceEventsDigest(events) {
    const hash = createHash('sha256');
    hash.update(`${events.length}:`);
    for (const event of events) {
        const json = JSON.stringify(event);
        hash.update(`${Buffer.byteLength(json)}:`);
        hash.update(json);
    }
    return hash.digest('hex');
}
export function isCalendarIndexValid(index, events, { timeZone = "UTC", windowYear = new Date().getUTCFullYear() } = {}) {
    const window = calendarYearWindow(windowYear);
    if (!index || index.schemaVersion !== 2 || index.sourceEventsSha256 !== sourceEventsDigest(events) || index.timeZone !== timeZone || Object.entries(window).some(([k, v]) => index[k] !== v))
        return false;
    if (!index.months || !Array.isArray(index.availableMonthsWithEvents) || JSON.stringify(Object.keys(index.months).sort()) !== JSON.stringify(index.availableMonthsWithEvents))
        return false;
    for (const [monthKey, month] of Object.entries(index.months)) {
        if (!month?.dates || monthKey !== month.monthKey)
            return false;
        for (const [date, bucket] of Object.entries(month.dates)) {
            if (!bucket || typeof bucket !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date < window.windowStart || date >= window.windowEndExclusive || date.slice(0, 7) !== monthKey || bucket.dateKey !== date || !Array.isArray(bucket.eventIndexes) || 'events' in bucket)
                return false;
            if (bucket.eventIndexes.some(ref => !Number.isInteger(ref) || ref < 0 || ref >= events.length))
                return false;
        }
    }
    return true;
}
function compareCanonicalEvents(a, b) { return buildSortKey(a).localeCompare(buildSortKey(b)) || (a.summary || '').localeCompare(b.summary || ''); }
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
export function listVisibleDatesForEvent(event, timeZone, window = calendarYearWindow()) {
    if (!event)
        return [];
    let startDateKey, endDateKey;
    if (event.dateKind === 'date') {
        const normalized = normalizeDateOnlyInterval(event);
        if (!normalized)
            return [];
        startDateKey = normalized.sourceDate;
        endDateKey = new Date(Date.parse(normalized.endSourceDateExclusive) - DAY_MS).toISOString().slice(0, 10);
    }
    else {
        if (!event.startInstant || !Number.isFinite(Date.parse(event.startInstant)))
            return [];
        if (event.endInstant && (!Number.isFinite(Date.parse(event.endInstant)) || event.endInstant < event.startInstant))
            return [];
        startDateKey = formatDateKeyInTimeZone(event.startInstant, timeZone);
        endDateKey = formatDateKeyInTimeZone(event.endInstant || event.startInstant, timeZone);
    }
    const lastWindowDate = new Date(Date.parse(window.windowEndExclusive) - DAY_MS).toISOString().slice(0, 10);
    return listDateKeysBetween(startDateKey < window.windowStart ? window.windowStart : startDateKey, endDateKey > lastWindowDate ? lastWindowDate : endDateKey);
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
export function toVisibleDayEvent(event, timeZone, visibleDate) {
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
function buildSortKey(event) {
    return event.startInstant || `${event.sourceDate || ""}T00:00:00.000Z`;
}
const DAY_MS = 24 * 60 * 60 * 1000;
