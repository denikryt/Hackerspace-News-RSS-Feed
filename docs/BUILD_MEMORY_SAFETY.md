# Build memory safety

Implementation follows `01_BUILD_MEMORY_SAFETY_PLAN(6).md`, master 1338ec92c5.
Only one builder is supported. No build locks or concurrent publication protocol.

## Execution guarantees and validation environment

Docker Compose configures `site-builder` with 1024 MiB RAM and 1024 MiB combined
RAM+swap, and 768 MiB V8 old-space. Overrides: `BUILDER_MEMORY_MIB` and
`NODE_OLD_SPACE_MIB`. The shared configuration rejects old-space >= RAM.
Direct npm commands have **no hard RSS guarantee**. V8 old-space excludes
Buffers, external allocations and other process memory.

Docker was not run, as requested. This sandbox also lacks a usable systemd bus,
cgroup memory files and `/proc` RSS metrics. No hard limit or RSS result has
been verified here. `process.memoryUsage()` reports `ENOENT`; diagnostics
record null RSS plus an error rather than manufacturing measurements.

For an operator-controlled Linux host with cgroup v2 and delegated memory
controller, check `/sys/fs/cgroup/cgroup.controllers` includes `memory`, then:

```sh
systemd-run --user --scope -p MemoryMax=1G -p MemorySwapMax=0 npm run build
```

Use `systemctl --user show UNIT -p ControlGroup -p MemoryMax -p MemorySwapMax`
and read the unit's `memory.max` and `memory.swap.max`; verify all child PIDs
belong to the scope. An unavailable bus/controller is a failed precondition,
not protection. OOM/nonzero exit must abort the pipeline. Run `npm run refresh`
and `npm run render` separately inside such scopes to distinguish their peaks.
For Docker operators, inspect actual `HostConfig.Memory/MemorySwap` and use
`docker stats`; diagnose host OOM separately with `journalctl -b -1 -k`.
These are operator instructions, not commands executed in this implementation.

Set `BUILD_MEMORY_DIAGNOSTICS=1` for sparse JSON phase checkpoints. Whitelisted
counters include RSS/heap/external/arrayBuffers MiB, pages, failures and largest
input bytes. Input bodies never enter metrics. Byte/time configuration errors
fail before acquisition. Environment keys are listed in `src/resourceLimits.js`.

## Real input measurement, 2026-10-24

Reproduce: `node scripts/audit-build-inputs.mjs data`. Full per-source results
and all observed RRULE forms are in `docs/BUILD_INPUT_AUDIT.json`.
Snapshot generated 2026-08-04, 369 feeds, 15,216 publications, 114,927,814 bytes.
Measure one effective text using current Newspaper priority: summaryHtml,
contentHtml, summaryText, contentText; strip HTML, normalize whitespace and
decode the renderer's entities; count Unicode code points. Exclude empty texts.
Nearest-rank P90/P95, ordinary midpoint median.

| Metric | Value |
|---|---:|
| Nonempty texts | 8,808 |
| Empty texts | 6,408 |
| Mean | 1094.433923705722 |
| Median | 513 |
| P90 | 2701 |
| P95 | 4093 |
| Measured L = ceil(mean) | 1095 |
| Texts exceeding L | 2,118 (24.0463%) |

L is measured, not an arbitrary safety policy. It is activated only in Stage 2.
All available primary RSS snapshot publications were sampled. Curated is a
separate selected-content snapshot, not an independent RSS sample.
Maximum feed item count is 5,980: the explicit 500-item policy rejects this
source during refresh; it does not silently trim history. No raw XML feed
bodies were supplied, so body-byte policy acceptance cannot be inferred from
normalized JSON size. Largest saved ICS body and all source bytes are in the
audit. Body ceilings remain HTML/ICS 8 MiB, RSS 4 MiB, SpaceAPI 1 MiB;
output 32 MiB, newspaper text preflight 16 MiB. Changes to these policies require
an explicit reason and regression test; no per-domain exemptions.

## Calendar recurrence decision gate

61 source metadata rows; 51 saved ICS files, 10 unknown/unavailable bodies.
32 available files contain recurrence properties: 800 RRULE, 191 RDATE,
533 EXDATE and 420 RECURRENCE-ID properties. There are 651 distinct RRULE
strings. These are actual saved source responses, not synthetic examples.
The existing parser omits occurrences, so recurrence is required. Unknown
sources are not evidence of recurrence absence. Stage 2 must first define
supported observed forms and overrides from this audit, update the existing
plan, and then test expansion bounded to the three-year window. It must not
silently treat an unhandled rule as a fully parsed series.

## Baseline

TypeScript check passes. Initial suite: 460 passing, 3 failing tests:
legacy `/feed/` path literals in a renderer fixture conflict with architecture
checks; Newspaper navigation expects `Events` but existing nav says `Calendar`;
author pagination expects May 2026 but does not freeze its clock (October).
Failures predate implementation. Test runs use an external preload to let
Vitest obtain V8 counters when `/proc` is hidden; its zero RSS sentinel is never
used for profiling or production. No production data is modified by auditing.
