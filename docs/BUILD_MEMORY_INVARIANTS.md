# Memory-safety invariant checklist

The implementation uses the plan's boundaries, one builder and no locks.
Positive and negative cases are paired below; test paths are relative to tests/.

| Invariant / authoritative boundary | Positive regression | Negative regression |
|---|---|---|
| Validated immutable resource policy before work | unit/resourceLimits: positive override | malformed/zero/fractional/unsafe old-space |
| HTTP byte limit and fetch-through-body deadline | unit/fetchBoundedText: N bytes, split UTF-8, HTTP result | N+1, lying headers, stalled body/fetch, abort, invalid stream, cancel |
| Bounded source concurrency, order and cleanup | unit/mapWithConcurrency: active work <= pool | failing mapper drains outstanding work before cleanup |
| RSS item count independent of text length | unit/feedInputLimits: 500 items, L+1 retained/truncated | 501 rejects source |
| One Unicode/HTML idempotent text limiter at acquisition and render | unit/truncateContentText; integration/pipelines/memorySafetyRender: RSS/curated/ICS items preserved | legacy L+1 and nested old source arrays cannot bypass publication limit |
| Date-only raw DTSTART/DTEND repaired before filtering | unit/calendarSafety: exclusive end, old sourceDate repair | invalid interval, dates outside window |
| Canonical root calendar events; source items metadata-only | integration/pipelines/calendarRawSafety; memorySafetyRender: count/URL/status retained | nested events/raw text absent; failed raw write preserves old snapshot |
| Reference index bound to ordered canonical events/schema/year/timezone | unit/calendarSafety: duplicate UID entries retained, numeric refs | reordered/edited events, changed year/tz/schema, malformed buckets/date, -1/N/fraction ref |
| Three full years; clip before day fanout | unit/calendarTimeRuntime: 1900-2100 event -> 1095 days; rollover | no days outside window; UTC edge invisible until browser timezone moves it inside |
| Conditional recurrence reflects saved source forms | unit/calendarRecurrence: ordinal/BYSETPOS/COUNT/UNTIL/INTERVAL/DST/RDATE/EXDATE/overrides; real-data/calendarMemorySafety | cancelled/moved-out exceptions and unsupported subdaily/period forms |
| Render remains offline and repairs derived indices | architecture/renderFlowBoundary; integration/pipelines/memorySafetyRender | fetch forbidden, stale full-object/wrong-date index discarded |
| Disk render retains only one page and path list | unit/renderPageSink; memorySafetyRender: memory/disk parity | duplicate/absolute/traversal/backslash/NUL paths; N+1 artifact/preflight budget |
| Promote only after all output and assets succeed | unit/stagedDirectory; memorySafetyRender | ENOSPC and EACCES leave sentinel output, staging removed |
| Process lifetime separates refresh/curated/render | contracts/cli/buildProcesses; integration/pipelines/buildCliSmoke: separate PIDs, real snapshot handoff, discovery forwarding | nonzero/spawn error/SIGINT/SIGTERM never advances; wiki failure preserves prior output |
| No raw remote text in diagnostics | unit/resourceLimits whitelist, feedParserSafety, calendarPublicationSafety | remote XML/ICS parse messages cannot echo content |
| Fixed native formatters reused with unchanged labels | unit/calendarDateFormatting/renderDateFormatting; calendar HTML parity script | repeated dates create no per-item publication/month formatter; invalid date omitted |
| Output-memory growth within measured target | opt-in performance/buildMemory: 250 vs 2410 pages; 8/32 long-event index | asserts <=128 MiB RSS growth, zero index description copies, complete ref counts |
| Hard total-memory protection only with active OS cgroup | scripts/builderMemoryLimits; documented Docker/systemd config | bare npm is never described as hard-RSS-limited; runtime cgroup/OOM smoke explicitly unverified |

Calendar model/HTML equality against baseline commit is checked by
`node scripts/check-calendar-html-parity.mjs`: nine timezone/month cases,
same-UID independent records, order, navigation, time labels and global filters.
The deliberate date-only multi-day correction is tested separately.

Adversarial review found and corrected: timed public projection lacked its
one-day UTC margin; null/corrupt index buckets could throw instead of rebuild;
ICS/XML parser errors could quote remote content; output paths accepted NUL;
noncalendar per-publication native formatters still inflated RSS. Regression
checks cover each. Invalid source intervals are counted in skippedEvents;
canonical valid events are never sourced from the discarded nested arrays.
No serializer subsystem, recurrence engine, migration state or builder
coordination was introduced. The external pinned ICS library handles only the
audited forms through the bounded adapter.

Known boundaries: snapshots and author models remain in memory; recurring
masters are iterated without retaining pre-window occurrences. Local directory
promotion is best-effort rollback for handled errors, not power-loss atomicity.
The snapshot set is not a cross-file transaction. A cgroup OOM may preclude
cleanup; no crash-atomic publish guarantee is claimed.
