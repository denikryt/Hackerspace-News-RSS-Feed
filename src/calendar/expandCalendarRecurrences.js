import ICAL from 'ical.js';
import { truncateContentText } from '../truncateContentText.js';
import { calendarYearWindow, calendarEventIntersectsWindow as intersects } from './normalizeCalendarSnapshot.js';
// Expansion is conditional on observed recurrence properties. ICAL.js owns
// RFC rule arithmetic; this adapter owns source identity and bounded output.
export function expandCalendarRecurrences(text, { windowYear, parseComponent, componentIndexes }) {
    const calendar = text instanceof ICAL.Component ? text : readRecurrenceCalendar(text);
    const components = calendar.getAllSubcomponents('vevent');
    const window = calendarYearWindow(windowYear);
    const output = [];
    // Local recurrence dates may differ from UTC by a day. Two local guard
    // days cover the public UTC candidate margin without emitting extra days.
    const timedStart = new Date(Date.parse(window.windowStart) - 2 * 86400000).toISOString().slice(0, 10);
    const timedEnd = new Date(Date.parse(window.windowEndExclusive) + 2 * 86400000).toISOString().slice(0, 10);
    const exceptions = components.filter(c => c.hasProperty('recurrence-id'));
    // Even detached future overrides must satisfy the supported source contract.
    for (const exception of exceptions) assertSupported(exception);
    const emittedExceptions = new Set();
    for (const [componentIndex, component] of components.entries()) {
        if (component.hasProperty('recurrence-id'))
            continue;
        if (!component.hasProperty('dtstart'))
            continue;
        const master = new ICAL.Event(component);
        if (!master.isRecurring()) {
            const value = parseComponent(component.toString());
            if (value)
                output.push({ ...value, sourceComponentIndex: componentIndexes?.[componentIndex] ?? componentIndex });
            continue;
        }
        assertSupported(component);
        const related = exceptions.filter(c => c.getFirstPropertyValue('uid') === master.uid);
        for (const exception of related) {
            master.relateException(new ICAL.Event(exception));
        }
        const iterator = master.iterator();
        let occurrence;
        // Pre-window timestamps are iterated but never collected as event objects.
        // Observed rules are daily or coarser, so no sub-daily fanout is accepted.
        while ((occurrence = iterator.next())) {
            if (occurrence.toString().slice(0, 10) >= (master.startDate.isDate ? window.windowEndExclusive : timedEnd))
                break;
            const details = master.getOccurrenceDetails(occurrence);
            const endKey = details.endDate.toString().slice(0, 10);
            if (endKey < (master.startDate.isDate ? window.windowStart : timedStart))
                continue;
            const actual = details.item.component;
            if (actual.hasProperty('recurrence-id'))
                emittedExceptions.add(actual);
            if (actual.getFirstPropertyValue('status') === 'CANCELLED')
                continue;
            const clone = new ICAL.Component(structuredClone(actual.toJSON()));
            clone.updatePropertyWithValue('dtstart', details.startDate);
            clone.updatePropertyWithValue('dtend', details.endDate);
            const value = parseComponent(clone.toString());
            if (value && intersects(value, window))
                output.push({ ...value, recurrenceId: occurrence.toICALString(), sourceComponentIndex: componentIndexes?.[componentIndex] ?? componentIndex });
        }
    }
    // Detached overrides can move from an out-of-window recurrence ID into the
    // window. Preserve those even when the master's iteration did not visit them.
    for (const exception of exceptions) {
        if (emittedExceptions.has(exception) || exception.getFirstPropertyValue('status') === 'CANCELLED')
            continue;
        const value = parseComponent(exception.toString());
        if (value && intersects(value, window))
            output.push({ ...value, recurrenceId: exception.getFirstPropertyValue('recurrence-id').toICALString(), sourceComponentIndex: componentIndexes?.[components.indexOf(exception)] ?? components.indexOf(exception) });
    }
    return output;
}
// Unknown semantics must fail visibly, rather than masquerade as one VEVENT.
function assertSupported(component) {
    const allowed = new Set(['FREQ', 'BYMONTH', 'BYDAY', 'UNTIL', 'WKST', 'COUNT', 'INTERVAL', 'BYSETPOS', 'BYMONTHDAY']);
    for (const rule of component.getAllProperties('rrule')) {
        const value = rule.getFirstValue().toString();
        if (value.split(';').some(part => /^(COUNT|INTERVAL)=/.test(part) && !(Number(part.split('=')[1]) > 0)))
            throw unsupported();
        if (!/FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)(;|$)/.test(value) || value.split(';').some(p => !allowed.has(p.split('=')[0])))
            throw unsupported();
    }
    for (const property of component.getAllProperties('rdate'))
        if (property.type === 'period')
            throw unsupported();
    if (component.getFirstProperty('recurrence-id')?.getParameter('range'))
        throw unsupported();
}
function unsupported() { return Object.assign(new Error('unsupported_calendar_recurrence'), { code: 'unsupported_calendar_recurrence' }); }
// Refresh captures the definitions from the same parsed source it expands.
// jCal retains RFC types/TZID parameters without storing the entire raw body.
export function captureCalendarRecurrences(text, options) {
    const calendar = readRecurrenceCalendar(text);
    return { events: expandCalendarRecurrences(calendar, options), recurrence: serializeRecurrenceCalendar(calendar) };
}
// Acquired ICS and retained jCal use one component parser.
function readRecurrenceCalendar(value) {
    if (Array.isArray(value))
        return new ICAL.Component(structuredClone(value));
    const unfolded = value.replace(/\r?\n[ \t]/g, '').split(/\r?\n/).filter(line => line.includes(':')).join('\r\n');
    return new ICAL.Component(ICAL.parse(unfolded));
}
// Only source definitions needed for future occurrences are persisted. Ordinary
// VEVENTs stay solely in canonical events; descriptions share the normal limit.
function serializeRecurrenceCalendar(calendar) {
    const allowed = new Set(['uid', 'summary', 'dtstart', 'dtend', 'duration', 'rrule', 'rdate', 'exdate', 'recurrence-id', 'status', 'description', 'location', 'url', 'categories', 'organizer']);
    const components = [];
    const componentIndexes = [];
    for (const [index, event] of calendar.getAllSubcomponents('vevent').entries()) {
        if (!event.hasProperty('rrule') && !event.hasProperty('rdate') && !event.hasProperty('recurrence-id'))
            continue;
        const raw = structuredClone(event.toJSON());
        const properties = raw[1].filter(property => allowed.has(property[0]));
        for (const property of properties) {
            if (property[0] === 'description')
                for (let i = 3; i < property.length; i++)
                    property[i] = truncateContentText(property[i]);
        }
        components.push(['vevent', properties, []]);
        componentIndexes.push(index);
    }
    if (!components.length)
        return null;
    const zones = calendar.getAllSubcomponents('vtimezone').map(zone => structuredClone(zone.toJSON()));
    return { calendar: ['vcalendar', [['version', {}, 'text', '2.0']], [...zones, ...components]], componentIndexes };
}
// Persisted definitions are validated even when this year's materialization is
// reusable: bad future rules must fail here, before the output stage is opened.
export function validateRecurrenceDefinition(definition) {
    const data = definition?.calendar;
    if (!Array.isArray(data) || data[0] !== 'vcalendar' || !Array.isArray(data[1]) || !Array.isArray(data[2]))
        throw new Error('Invalid jCal');
    const calendar = readRecurrenceCalendar(data);
    const events = calendar.getAllSubcomponents('vevent');
    const indexes = definition.componentIndexes;
    if (!events.length || !Array.isArray(indexes) || indexes.length !== events.length || indexes.some((index, position) => !Number.isSafeInteger(index) || index < 0 || position > 0 && index <= indexes[position - 1]))
        throw new Error('Invalid component positions');
    if (calendar.getAllSubcomponents().some(component => !['vevent', 'vtimezone'].includes(component.name)))
        throw new Error('Invalid recurrence component');
    for (const event of events) {
        if (!event.hasProperty('rrule') && !event.hasProperty('rdate') && !event.hasProperty('recurrence-id'))
            throw new Error('Not a recurring template');
        assertSupported(event);
    }
    return calendar;
}
