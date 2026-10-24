import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { withStagedDirectory } from '../../src/stagedDirectory.js';
it('preserves the previous directory when generation fails, then replaces stale files on success', async () => {
    const root = await mkdtemp(join(tmpdir(), 'staging-'));
    const target = join(root, 'dist');
    try {
        await withStagedDirectory(target, async (stage) => writeFile(join(stage, 'old'), 'sentinel'));
        await expect(withStagedDirectory(target, async (stage) => { await writeFile(join(stage, 'new'), 'partial'); throw Object.assign(new Error('full'), { code: 'ENOSPC' }); })).rejects.toMatchObject({ code: 'ENOSPC' });
        expect(await readFile(join(target, 'old'), 'utf8')).toBe('sentinel');
        await withStagedDirectory(target, async (stage) => writeFile(join(stage, 'new'), 'complete'));
        await expect(readFile(join(target, 'old'))).rejects.toMatchObject({ code: 'ENOENT' });
    }
    finally {
        await rm(root, { recursive: true, force: true });
    }
});
