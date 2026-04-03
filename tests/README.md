# Test Layers

This suite uses canonical top-level layers so test placement communicates scope before the file is opened.

## Canonical directories

- `tests/architecture/`: boundary and invariant tests for module import behavior and test-suite structure.
- `tests/unit/`: local deterministic rules, parsing, normalization, helpers, and renderer fragment behavior.
- `tests/contracts/`: stable public interfaces for renderers, CLI entry points, and preview-server behavior.
- `tests/integration/`: multi-module refresh/render/build/discovery/analysis composition over controlled fixtures.
- `tests/real-data/`: confidence checks against repository data snapshots.
- `tests/scripts/`: shell-script execution contracts and file-system side effects.
- `tests/_shared/`: test-only helpers that should not be discovered as tests.

## Migration map

- `tests/architecture/`: `serveModuleBoundary.test.js`, `renderFlowBoundary.test.js`, `testLayout.test.js`, `layerGuidance.test.js`, `testSupportContracts.test.js`
- `tests/unit/`: `authorParsing.test.js`, `categoryDictionary.test.js`, `contentDisplay.test.js`, `discoveryValidSourceList.test.js`, `feedEnricher.test.js`, `feedNormalizer.test.js`, `feedProbe.test.js`, `pageFetcher.test.js`, `pagination.test.js`, `renderField.test.js`, `renderPageHeader.test.js`, `renderProgress.test.js`, `requestScheduler.test.js`, `sourceTableExtractor.test.js`, `visibleData.test.js`, `websiteSourceExtractor.test.js`, `wikiDiscoveryComparison.test.js`, `wikiDiscoveryUnmatchedResponseComparison.test.js`
- `tests/unit/view-models/`: `authors.test.js`, `feedSections.test.js`, `spaceDetailModel.test.js`, `viewModels.test.js`
- `tests/contracts/cli/`: `analyzeWikiDiscoveryUnmatchedResponsesCli.test.js`, `cliHelp.test.js`, `discoverFeedsCli.test.js`, `discoverValidSourceUrlsCli.test.js`, `refreshBuildDiscoveryFlag.test.js`, `renderTimingLogs.test.js`, `serveCli.test.js`
- `tests/contracts/renderers/`: `renderAboutPage.test.js`, `renderAuthorPages.test.js`, `renderContent.test.js`, `renderFeedPages.test.js`, `renderSpacesIndex.test.js`
- `tests/integration/pipelines/`: `buildDataset.test.js`, `refreshDataset.test.js`, `renderSite.test.js`
- `tests/integration/discovery/`: `discoverHackerspaceFeeds.test.js`
- `tests/integration/analysis/`: `feedFieldInventory.test.js`
- `tests/real-data/`: `authorRealData.test.js`
- `tests/scripts/`: `deploySiteScript.test.js`, `installDeploySiteTimerScript.test.js`

## Hybrid placements

- `tests/integration/pipelines/renderSite.test.js`: classified as integration because its primary value is page-generation composition across data loading, view models, and renderers.
- `tests/integration/pipelines/buildDataset.test.js`: classified as integration because it composes refresh and render stages into one dataset build.
- `tests/integration/analysis/feedFieldInventory.test.js`: classified as integration because it exercises analysis flow, artifact writing, and CLI execution together.
- Hybrid rule: if the main value is multi-module composition, keep the test in `integration` even when it contains some contract assertions.
- Contract rule: if the main value is the stable public shape of one module boundary, keep the test in `contracts`.
- Unit rule: if the main value is deterministic local logic, keep the test in `unit`.

## Shared helpers

- `tests/_shared/paths.js`: repository and fixture path helpers that remain stable after file moves.
- `tests/_shared/http.js`: fetch-like response builders for integration tests that stub network IO.
- `tests/_shared/tempDirs.js`: tracked temp-directory helpers for async and sync tests.

## Fixture ownership

- `tests/fixtures/` owns reusable static inputs shared across layers.
- `tests/fixtures/source-page/` holds captured wiki/source HTML snapshots used by extractor, discovery, and pipeline tests.
- Keep new reusable snapshots in `tests/fixtures/` when more than one test file benefits from them.
- Keep one-off inline inputs inside the test file when they only serve a single local scenario.

## Avoiding duplicate assertions

- `tests/architecture/` owns cross-flow invariants such as import-time behavior and render-only no-network guarantees.
- `tests/unit/` owns detailed parsing, normalization, enrichment, and local renderer-fragment rules.
- `tests/contracts/` owns stable CLI, renderer, and artifact interface expectations.
- `tests/integration/` should verify module composition, file writing, and end-to-end-ish flow outcomes without restating every lower-level field rule already covered in `unit` or `contracts`.
- When moving or adding a test, prefer relocating an existing assertion to the narrowest layer that fully explains it rather than copying the same behavior into two layers.

## Adding new tests

- Put a new test in `tests/architecture/` when it guards a repository-wide invariant or module boundary that should stay true regardless of feature work.
- Put a new test in `tests/unit/` when it exercises one deterministic module or helper in isolation.
- Put a new test in `tests/contracts/` when it documents a stable public shape, CLI surface, or renderer output boundary.
- Put a new test in `tests/integration/` when the behavior only makes sense across multiple modules, temp directories, and fixtures together.
- Put a new test in `tests/real-data/` when it needs repository data artifacts rather than invented fixtures.
- Put a new test in `tests/scripts/` when it executes shell entry points or system-facing install/deploy behavior.
