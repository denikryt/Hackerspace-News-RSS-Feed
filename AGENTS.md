# AGENTS.md

## Purpose

This file fixes the core development rules for this project.

The most important rule is strict TDD.

## Project Context

This project is a static site generator for hackerspace news feeds.

At a high level, the project is split into two main flows:

- data refresh flow: fetches and validates source data, parses feeds, and updates local snapshots;
- render flow: builds static HTML pages from the local project data.

Important structure:

- `src/cli/refresh.js` runs the refresh pipeline;
- `src/cli/render.js` runs the render pipeline;
- `src/cli/build.js` runs refresh and then render;
- `src/refreshDataset.js` is the main data refresh entry point;
- `src/renderSite.js` is the main site rendering entry point;
- `src/viewModels/` contains page-level view-model builders;
- `src/renderers/` contains HTML renderers for concrete pages;
- `tests/` contains the automated test suite.

When working on this repository, prefer understanding changes in terms of:

- input acquisition and refresh logic;
- normalization and view-model contracts;
- page rendering from existing prepared data;
- CLI entry points that connect the pipeline together.

## Mandatory Development Rules

### 1. Strict TDD

Every non-trivial change must follow this order:

1. first make the intended behavior or contract explicit;
2. capture it with a failing test before implementation is finalized;
3. implement the smallest possible change to make it pass;
4. refactor without changing behavior;
5. run the relevant tests again.

What this means in practice:

- do not write tests before you understand the rule they are supposed to fix;
- do not start with UI implementation;
- do not start with refactoring;
- do not add behavior first and “cover it later”;
- do not weaken tests just to make them pass;
- do not silently change output contracts without updating tests first.

Refactor is mandatory after the first green test for any non-trivial change.

The purpose of this refactor step is not cosmetic cleanup. Its purpose is to make the code easier for a human to read and understand.

Refactor should improve, when needed:

- naming clarity;
- function and module boundaries;
- separation of responsibilities;
- removal of unnecessary branching, duplication, and incidental complexity;
- visibility of the main data flow;
- local readability of non-obvious logic.

Readable code in this project means:

- a reader can understand what the code does without mentally reconstructing hidden assumptions;
- functions have a narrow and legible purpose;
- modules expose clear responsibilities;
- the main path is easy to follow;
- special cases and fallback rules are explicit;
- comments are added only where the intent or reasoning would otherwise remain hard to infer.

Do not stop after “the test passes” if the resulting code is still awkward, overly compressed, or harder to read than necessary.

### 1.1. Comments For Readability

Writing comments for readability is mandatory.

Write comments to make the code easier for a human to read.

By default:

- add a short comment to each non-trivial module, function, class, and complex logic block;
- explain what the code is doing, why it exists, and what rule or invariant it is enforcing;
- be especially explicit around parsing, fallback chains, grouping, skipping, truncation, and real-data assumptions.

Do not restate syntax.

Good comments explain intent, not mechanics.

### 2. Rendering

UI must render only data that is actually present.

Never invent missing values.

If a field is unavailable:

- omit it from the UI;
- keep the page stable and readable.

## Change Discipline

Before implementing a new behavior:

1. define the view-model or output contract;
2. write tests for that contract;
3. implement the minimum code;
4. verify with real data after tests pass.

## Test Layer Placement Rule

When adding a new test, place it in the narrowest `tests/` layer that directly owns the rule being checked.

Use these rules:

- put a new test in `tests/architecture/` when it guards a repository-wide invariant or module boundary that should stay true regardless of feature work;
- put a new test in `tests/unit/` when it exercises one deterministic module or helper in isolation;
- put a new test in `tests/contracts/` when it documents a stable public shape, CLI surface, or renderer output boundary;
- put a new test in `tests/integration/` when the behavior only makes sense across multiple modules, temp directories, and fixtures together;
- put a new test in `tests/real-data/` when it needs repository data artifacts rather than invented fixtures;
- put a new test in `tests/scripts/` when it executes shell entry points or system-facing install/deploy behavior.

## Real-Data Rule

Any logic that is intended to work on real project data must be implemented based on real project data.

That means:

- do not invent input shapes from memory or assumptions;
- do not design parsing, normalization, mapping, or fallback rules only from hypothetical examples;
- first inspect the real data, fixtures, snapshots, or analysis artifacts that the logic will actually process;
- only after that define the rule or contract and implement the logic.

In practice, for any non-trivial real-data behavior:

1. inspect the relevant real data first;
2. identify the actual observed cases and variations;
3. define the contract or rule based on those observations;
4. write tests from those observed cases;
5. implement the logic.

If the real data has not been inspected yet, the logic is not ready to be implemented.

## Plan Writing Protocol

When the user explicitly asks for a plan, write it as a structured implementation plan.

Every new plan file in `plans/` must be numbered.

Plan filename rule:

- use a zero-padded ordinal prefix at the start of the filename;
- choose the next available number relative to the existing plan files in `plans/`;
- keep the descriptive uppercase name after the numeric prefix.

Example:

- `04_EXAMPLE_PLAN.md`

Every plan should include these blocks:

### 1. Goal

Describe:

- what should be achieved;
- why the work is needed;
- what problem the plan is solving.

### 2. Expected Behavior

Describe the observable result after implementation:

- what the system should do;
- what should happen after running the feature, script, or flow;
- what should explicitly remain unchanged.

This section defines the behavior contract for the plan.

### 3. Inputs

Describe:

- what data, files, commands, sources, or dependencies the implementation uses;
- which inputs are primary;
- which assumptions or constraints apply in the first version.

### 4. Outputs

Describe:

- what artifacts, pages, JSON, CLI output, or side effects should be produced;
- what the minimum output contract must contain.

### 5. Architecture

Describe the intended implementation shape before coding:

- main layers, modules, or pipeline stages;
- boundaries between responsibilities;
- what is intentionally out of scope.

### 6. Implementation Stages

Break the work into sequential stages.

For each stage include:

- stage goal;
- what will be implemented;
- which tests must be written first;
- readiness criterion.

Stages should be small enough to support strict TDD.

### 7. TDD Strategy

Describe the order of development as short red-green-refactor cycles.

This section should make clear:

- which contract is tested first;
- which minimal implementation follows;
- how the work is expanded incrementally;
- what should not be built too early.

### 8. Test Plan

List the test groups needed for confidence.

Typical groups:

- unit tests;
- integration tests;
- smoke tests;
- fixture-based or contract tests when relevant.

For each group, list the key behaviors or cases that must be covered.

## Plan Quality Rules

Any implementation plan should:

- start from behavior and contracts, not from refactoring or UI polish;
- be specific enough that each stage can be implemented via TDD;
- distinguish inputs, outputs, and architecture explicitly;
- define what is in scope and what remains unchanged;
- include concrete readiness criteria for each stage;
- include a test plan, not only implementation steps.

## Notes Writing Rules

Use notes in `notes/` for short idea capture, not for implementation planning.

Every new note file in `notes/` must be numbered.

Note filename rule:

- use a zero-padded ordinal prefix at the start of the filename;
- choose the next available number relative to the existing note files in `notes/`;
- keep the descriptive uppercase name after the numeric prefix.

Example:

- `14_EXAMPLE_NOTE.md`

A note should be:

- short and easy to scan;
- written around one concrete problem or idea;
- grounded in the real project structure, data, or UX;
- explicit about why the idea matters.

Default note structure:

- `# Title`
- `## Problem`
- `## Draft implementation`
- `## Draft Result`

`## Draft implementation` should describe one realistic implementation direction that follows from the current project context.

For notes:

- do not enumerate several alternative scenarios by default;
- do not write broad option menus unless the user explicitly asks for alternatives;
- choose the implementation direction that currently looks most realistic and coherent for this project;
- describe that direction briefly and concretely.

`## Draft Result` should be short and simple.

Use it to describe, in draft form:

- what the final behavior or result would look like if this idea is implemented;
- by what high-level mechanism it would work, in plain words;
- only the minimum needed to make the idea concrete.

Do not turn `## Draft Result` into:

- a full implementation plan;
- detailed architecture staging;
- long lists of repeated consequences or restatements.

Notes should describe the concrete problem, one plausible implementation direction, and the expected result.

Do not turn a note into a full plan unless the user explicitly asks for a plan.

## Plan Analysis Agent

If the user asks to run an agent for plan analysis, first read `.codex/agents/plan-analyzer.toml` and use its instructions for that agent run.

For this agent run, the required minimum is:

- the path to the plan file;
- the instructions defined for the agent in `.codex/agents/plan-analyzer.toml`.

Do not treat re-reading the plan file in the main agent as a required ritual before spawning the plan-analysis agent unless it is needed for some separate reason.

## Plan Implementation Analysis Agent

If the user asks to run an agent for analysis of the implementation of a plan, first read `.codex/agents/plan-implementation-analyzer.toml` and use its instructions for that agent run.

For this agent run, the required minimum is:

- the path to the relevant plan file;
- the instructions defined for the agent in `.codex/agents/plan-implementation-analyzer.toml`.

Do not treat re-reading the plan file in the main agent as a required ritual before spawning the plan-implementation-analysis agent unless it is needed for some separate reason.
