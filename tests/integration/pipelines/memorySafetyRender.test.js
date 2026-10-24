import { expect, it } from 'vitest';
import { load } from 'cheerio';
import { renderSite } from '../../../src/renderSite.js';
import { RESOURCE_LIMITS } from '../../../src/resourceLimits.js';
export function legacyInputs() {
    const event = { uid: 'keep', summary: 'Boundary event', dateKind: 'date', start: '20271231', end: '20280102', sourceDate: '2028-01-02', description: 'x'.repeat(RESOURCE_LIMITS.textMaxCodePoints + 1) };
    return { now: Date.parse('2026-05-17T12:00:00Z'), sourceRowsPayload: { urls: [] }, validationsPayload: [], normalizedPayload: { summary: { sourceRows: 1, validFeeds: 1, parsedFeeds: 1, emptyFeeds: 0, failedFeeds: 0 }, feeds: [{ id: 'space', spaceName: 'Real Shape', country: 'Germany', items: [{ id: 'keep', title: 'Post', link: 'https://example.test/post', displayDate: '2026-05-16T10:00:00.000Z', summaryText: 'x'.repeat(RESOURCE_LIMITS.textMaxCodePoints + 1) }] }], failures: [] }, calendarPayload: { events: [event], items: [{ url: 'https://example.test/calendar', eventCount: 8, events: [event] }] }, calendarIndexPayload: { months: {}, availableMonthsWithEvents: [] } };
}
it('offline render repairs a legacy snapshot, bounds text and does not mutate source data', async () => {
    const input = legacyInputs();
    const before = JSON.stringify(input);
    const result = await renderSite(input);
    const publicCalendar = JSON.parse(result.pages['calendar/events.json']);
    expect(publicCalendar.events).toHaveLength(1);
    expect(publicCalendar.events[0]).toMatchObject({ sourceDate: '2027-12-31', endSourceDateExclusive: '2028-01-02' });
    expect(Array.from(publicCalendar.events[0].description)).toHaveLength(RESOURCE_LIMITS.textMaxCodePoints);
    expect(publicCalendar.items).toEqual([{ url: 'https://example.test/calendar', eventCount: 8 }]);
    expect(Object.keys(result.pages).some(p => p.startsWith('calendar/2028-'))).toBe(false);
    expect(result.pages['calendar/2027-12/index.html']).toContain('Boundary event');
    expect(Array.from(load(result.pages['news/2026-05-16/index.html'])('.np-item-body').text())).toHaveLength(RESOURCE_LIMITS.textMaxCodePoints);
    expect(result.normalizedPayload.feeds[0].items[0].id).toBe('keep');
    expect(JSON.stringify(input)).toBe(before);
    const second = await renderSite({ ...input, normalizedPayload: result.normalizedPayload, calendarPayload: result.calendarPayload, calendarIndexPayload: result.calendarIndexPayload });
    expect(second.pages).toEqual(result.pages);
});
it('disk render exposes only a summary and produces the same HTML as in-memory render', async () => {
    const { mkdtemp, readFile, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const root = await mkdtemp(join(tmpdir(), 'disk-parity-'));
    const input = legacyInputs();
    try {
        const memory = await renderSite(input);
        const disk = await renderSite({ ...input, writePages: true, distDir: join(root, 'dist') });
        expect(disk).toEqual({ pageCount: Object.keys(memory.pages).length, outputDir: join(root, 'dist') });
        for (const [path, html] of Object.entries(memory.pages))
            expect(await readFile(join(root, 'dist', path), 'utf8')).toBe(html);
    }
    finally {
        await rm(root, { recursive: true, force: true });
    }
});
it('preserves existing disk output and cleans staging after ENOSPC or asset failure', async () => {
    const { mkdtemp, readFile, writeFile, mkdir, readdir, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const root = await mkdtemp(join(tmpdir(), 'disk-failure-'));
    const dist = join(root, 'dist');
    await mkdir(dist);
    await writeFile(join(dist, 'index.html'), 'sentinel');
    try {
        for (const injected of [{ writeTextImpl: async () => { throw Object.assign(new Error('full'), { code: 'ENOSPC' }); } }, { copyFileImpl: async () => { throw Object.assign(new Error('denied'), { code: 'EACCES' }); } }]) {
            await expect(renderSite({ ...legacyInputs(), distDir: dist, writePages: true, ...injected })).rejects.toThrow();
            expect(await readFile(join(dist, 'index.html'), 'utf8')).toBe('sentinel');
            expect(await readdir(root)).toEqual(['dist']);
        }
    }
    finally {
        await rm(root, { recursive: true, force: true });
    }
});
it('limits an independently loaded legacy curated snapshot at the same render boundary',async()=>{
 const input=legacyInputs();
 input.curatedPayload={items:[{id:'curated',title:'Curated entry',link:'https://example.test/curated',summaryText:'c'.repeat(RESOURCE_LIMITS.textMaxCodePoints+1),spaceName:'Real Shape'}]};
 const result=await renderSite(input);
 expect(Array.from(result.curatedPayload.items[0].summaryText)).toHaveLength(RESOURCE_LIMITS.textMaxCodePoints);
 expect(result.pages['curated/index.html']).toContain('Curated entry');
 expect(input.curatedPayload.items[0].summaryText.length).toBe(RESOURCE_LIMITS.textMaxCodePoints+1);
});
