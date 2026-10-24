import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
// Explicit opt-in only: each profile runs in a fresh heap-limited subprocess.
// This checks allocation growth, not an OS/cgroup hard memory guarantee.
describe.skipIf(process.env.BUILD_MEMORY_TESTS !== "1")("bounded build allocation regression", () => {
    it("renders >2000 pages without retaining their combined HTML", () => {
        const run = pages => JSON.parse(execFileSync(process.execPath, ["--max-old-space-size=384", "scripts/profile-build-memory.mjs", String(pages)], { encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "" }, maxBuffer: 1024 * 1024, timeout: 120000 }).trim());
        const small = run(200);
        const large = run(2000);
        expect(large.pageCount).toBeGreaterThan(2000);
        expect(large.pagesReturned).toBe(false);
        expect(large.outputBytes).toBeGreaterThan(small.outputBytes * 5);
        expect(large.peakRssMiB).toBeGreaterThan(0);
        expect(large.peakRssMiB - small.peakRssMiB).toBeLessThanOrEqual(128);
        console.log(JSON.stringify({ small, large }));
    }, 180000);
});
describe.skipIf(process.env.BUILD_MEMORY_TESTS !== "1")("reference index allocation", () => {
    it.each([8, 32])("stores no repeated descriptions for %i long independent events", count => {
        const run = mode => JSON.parse(execFileSync(process.execPath, ["--max-old-space-size=256", "scripts/profile-calendar-index.mjs", mode, String(count)], { encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "" }, timeout: 30000 }));
        const refs = run('refs');
        const full = run('full');
        expect(refs.references).toBe(count * 1095);
        expect(full.references).toBe(refs.references);
        expect(refs.descriptionCopies).toBe(0);
        expect(full.descriptionCopies).toBe(refs.references);
        expect(refs.jsonBytes).toBeLessThan(full.jsonBytes / 10);
        console.log(JSON.stringify({ refs, full }));
    });
});
