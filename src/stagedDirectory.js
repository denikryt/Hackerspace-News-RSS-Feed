import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
// One builder: prepare a sibling directory, promote only after success and
// attempt rollback on promotion failure. This is not a crash-atomic swap.
export async function withStagedDirectory(target, write) {
    const suffix = randomUUID();
    const stage = `${target}.staging-${suffix}`;
    const backup = `${target}.backup-${suffix}`;
    let moved = false;
    await mkdir(dirname(target), { recursive: true });
    await mkdir(stage);
    try {
        const result = await write(stage);
        try {
            await rename(target, backup);
            moved = true;
        }
        catch (error) {
            if (error.code !== 'ENOENT')
                throw error;
        }
        try {
            await rename(stage, target);
        }
        catch (error) {
            if (moved)
                await rename(backup, target).catch(() => { });
            throw error;
        }
        if (moved)
            await rm(backup, { recursive: true, force: true });
        return result;
    }
    finally {
        await rm(stage, { recursive: true, force: true });
    }
}
