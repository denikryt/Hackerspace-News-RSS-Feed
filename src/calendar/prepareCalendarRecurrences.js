import { validateRecurrenceDefinition } from './expandCalendarRecurrences.js';
import { parseCalendarRecurrenceDefinition, sortCalendarEvents } from './readCalendarEvents.js';
// A snapshot's recurring templates are the authority for a different year.
// This is an offline derivation, not a raw-file migration or network fallback.
export function prepareCalendarRecurrences(payload, { windowYear, previousWindowYear } = {}) {
    const recurrence = payload?.recurrence;
    const events = payload?.events || [];
    if (!recurrence) {
        const generatedYear = typeof payload?.generatedAt === 'string' ? new Date(payload.generatedAt).getUTCFullYear() : NaN;
        const oldYear = Number.isInteger(generatedYear) ? generatedYear : previousWindowYear;
        if (events.some(event => event.recurrenceId) && (!Number.isInteger(oldYear) || oldYear !== windowYear)) {
            throw snapshotError('calendar_recurrence_refresh_required');
        }
        return payload;
    }
    // Validate private data before even accepting a cached materialization. Parser
    // details may contain content, so only a stable local error crosses this boundary.
    const sourceFiles = new Set();
    try {
        if (recurrence.schemaVersion !== 1 || !Number.isInteger(recurrence.windowYear) || !Array.isArray(recurrence.sources) || !recurrence.sources.length)
            throw new Error();
        for (const source of recurrence.sources) {
            if (typeof source.sourceFile !== 'string' || !source.sourceFile || sourceFiles.has(source.sourceFile))
                throw new Error();
            for (const key of ['country', 'countryFlag', 'hackerspaceName']) {
                if (source[key] != null && typeof source[key] !== 'string') throw new Error();
            }
            sourceFiles.add(source.sourceFile);
            validateRecurrenceDefinition(source);
        }
        if (events.some(event => event.recurrenceId && !sourceFiles.has(event.sourceFile)))
            throw new Error();
    }
    catch {
        throw snapshotError('invalid_calendar_recurrence_snapshot');
    }
    if (recurrence.windowYear === windowYear)
        return payload;
    // Preserve ordinary events (including same-UID records) and replace only the
    // materialized recurrence records belonging to retained, source-local rules.
    const ordinary = events.filter(event => !event.recurrenceId || !sourceFiles.has(event.sourceFile));
    const expanded = [];
    try {
        for (const source of recurrence.sources) {
            const occurrences = parseCalendarRecurrenceDefinition(source, { sourceFile: source.sourceFile, windowYear });
            for (const event of occurrences)
                expanded.push({
                    ...event,
                    country: source.country || null,
                    countryFlag: source.countryFlag || null,
                    hackerspaceName: source.hackerspaceName || null,
                });
        }
    }
    catch {
        throw snapshotError('invalid_calendar_recurrence_snapshot');
    }
    const materialized = sortCalendarEvents([...ordinary, ...expanded]);
    return {
        ...payload, events: materialized,
        ...(payload.summary ? {summary: {...payload.summary, parsedEvents: materialized.length}} : {}),
        recurrence: {...recurrence, windowYear},
    };
}
function snapshotError(code) {
    return Object.assign(new Error(code), { code });
}
