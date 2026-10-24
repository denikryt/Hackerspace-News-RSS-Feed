import { expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { refreshCalendarSnapshot } from '../../../src/calendar/refreshCalendarSnapshot.js';
it('keeps source metadata only and preserves raw snapshots on write failure', async () => {
    const root = await mkdtemp(join(tmpdir(), 'raw-safety-'));
    const raw = join(root, 'raw');
    await mkdir(raw);
    await writeFile(join(raw, 'sentinel'), 'old');
    const body = 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:event\nDTSTART;VALUE=DATE:20260101\nDTEND;VALUE=DATE:20260102\nEND:VEVENT\nEND:VCALENDAR';
    const args = { sourceItems: [{ url: 'https://test.example/calendar.ics' }], fetchImpl: async () => new Response(body, { headers: { 'content-type': 'text/calendar' } }), rawDirectoryPath: raw, writeSnapshots: true };
    try {
        await expect(refreshCalendarSnapshot({ ...args, writeTextImpl: async () => { throw Object.assign(new Error('full'), { code: 'ENOSPC' }); } })).rejects.toMatchObject({ code: 'ENOSPC' });
        expect(await readFile(join(raw, 'sentinel'), 'utf8')).toBe('old');
        const result = await refreshCalendarSnapshot(args);
        expect(result.events).toHaveLength(1);
        expect(result.items[0]).toMatchObject({ eventCount: 1, status: 'parsed_ok' });
        expect(result.items[0]).not.toHaveProperty('events');
        expect(result.items[0]).not.toHaveProperty('rawIcsText');
        expect(await readdir(raw)).toEqual(['source-001.ics']);
    }
    finally {
        await rm(root, { recursive: true, force: true });
    }
});
