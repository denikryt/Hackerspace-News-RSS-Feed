import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, expect, it, vi } from 'vitest';
import { refreshCalendarSnapshot } from '../../../src/calendar/refreshCalendarSnapshot.js';
import { renderSite } from '../../../src/renderSite.js';
import { buildCalendarIndex } from '../../../src/calendar/buildCalendarIndex.js';
import { legacyInputs } from '../../_shared/memorySafetyFixtures.js';
const dirs = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });
const event = (uid, body) => `BEGIN:VEVENT\nUID:${uid}\nSUMMARY:Annual meeting\n${body}\nEND:VEVENT`;
const body = `BEGIN:VCALENDAR\nVERSION:2.0\n${event('yearly', 'DTSTART;VALUE=DATE:20250101\nRRULE:FREQ=YEARLY\nDESCRIPTION:future description')}\nEND:VCALENDAR`;
const inputFor = (payload, year) => ({ ...legacyInputs(), calendarPayload: payload, calendarIndexPayload: buildCalendarIndex(payload.events, { windowYear: 2026 }), now: Date.parse(`${year}-05-17T12:00:00Z`) });
async function snapshot(text = body) {
    return JSON.parse(JSON.stringify(await refreshCalendarSnapshot({ now: Date.parse('2026-06-01T12:00:00Z'), sourceItems: [{ url: 'https://source.test/events.ics', country: 'Germany', hs_name: 'Real space' }], fetchImpl: async () => new Response(text, { headers: { 'content-type': 'text/calendar' } }) })));
}
it('renders the following year offline from serialized snapshots, including future annual occurrences', async () => {
    const payload = await snapshot();
    expect(payload.events.map(event => event.sourceDate)).toEqual(['2025-01-01', '2026-01-01', '2027-01-01']);
    expect(payload.recurrence).toMatchObject({ schemaVersion: 1, windowYear: 2026 });
    const root = await mkdtemp(join(tmpdir(), 'recurrence-rollover-'));
    dirs.push(root);
    await mkdir(join(root, 'data'));
    const paths = { sourceRows: join(root, 'data/source.json'), validations: join(root, 'data/validation.json'), normalizedFeeds: join(root, 'data/feeds.json'), calendarEvents: join(root, 'data/events.json'), calendarIndex: join(root, 'data/index.json') };
    const input = inputFor(payload, 2027);
    for (const [key, value] of Object.entries({ sourceRows: input.sourceRowsPayload, validations: input.validationsPayload, normalizedFeeds: input.normalizedPayload, calendarEvents: payload, calendarIndex: input.calendarIndexPayload }))
        await writeFile(paths[key], JSON.stringify(value));
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('offline render must not fetch'); }));
    try {
        const before = await readFile(paths.calendarEvents, 'utf8');
        const disk = await renderSite({ paths, now: input.now, writePages: true, distDir: join(root, 'dist') });
        expect(disk.pageCount).toBeGreaterThan(0);
        const publicData = JSON.parse(await readFile(join(root, 'dist/calendar/events.json'), 'utf8'));
        expect(publicData.events.map(event => event.sourceDate)).toEqual(['2026-01-01', '2027-01-01', '2028-01-01']);
        expect(publicData).not.toHaveProperty('recurrence');
        expect(publicData.items[0]).not.toHaveProperty('events');
        expect(await readFile(join(root, 'dist/calendar/2028-01/index.html'), 'utf8')).toContain('Annual meeting');
        expect(await readFile(paths.calendarEvents, 'utf8')).toBe(before);
        expect(fetch).not.toHaveBeenCalled();
    }
    finally {
        vi.unstubAllGlobals();
    }
});
it('supports repeated rollovers, preserves nonrecurring events and is idempotent in the same year', async () => {
    const original = await snapshot(body.replace('END:VCALENDAR', `${event('ordinary', 'DTSTART;VALUE=DATE:20280101\nDESCRIPTION:Independent event')}\nEND:VCALENDAR`));
    const before = JSON.stringify(original);
    const first = await renderSite(inputFor(original, 2027));
    expect(first.calendarPayload.events.filter(event => event.sourceDate === '2028-01-01')).toHaveLength(2);
    expect(first.calendarPayload.events.find(event => event.uid === 'ordinary').description).toBe('Independent event');
    const again = await renderSite({ ...inputFor(first.calendarPayload, 2027), calendarIndexPayload: first.calendarIndexPayload });
    expect(again.pages).toEqual(first.pages);
    const next = await renderSite({ ...inputFor(JSON.parse(JSON.stringify(first.calendarPayload)), 2028), calendarIndexPayload: first.calendarIndexPayload });
    expect(JSON.parse(next.pages['calendar/events.json']).events.filter(event => event.uid === 'yearly').map(event => event.sourceDate)).toEqual(['2027-01-01', '2028-01-01', '2029-01-01']);
    expect(JSON.stringify(original)).toBe(before);
});
it('refuses stale expanded-only recurrence data rather than publish missing future occurrences', async () => {
    const payload = await snapshot();
    delete payload.recurrence;
    await expect(renderSite(inputFor(payload, 2027))).rejects.toMatchObject({ code: 'calendar_recurrence_refresh_required' });
});
