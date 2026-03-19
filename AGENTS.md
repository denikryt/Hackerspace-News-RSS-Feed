# AGENTS.md

## Purpose

This file fixes the core development rules for this project.

The most important rule is strict TDD.

## Mandatory Development Rules

### 1. Strict TDD

Every non-trivial change must follow this order:

1. write a failing test first;
2. implement the smallest possible change to make it pass;
3. refactor without changing behavior;
4. run the relevant tests again.

What this means in practice:

- do not start with UI implementation;
- do not start with refactoring;
- do not add behavior first and “cover it later”;
- do not weaken tests just to make them pass;
- do not silently change output contracts without updating tests first.

### 2. Source of Truth

The current source list comes from:

- `https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds`

Only the `Spaces with RSS feeds` section is relevant.

### 3. Data Handling

Normalized JSON is the project’s current local data layer.

Until there is a proven need for a database:

- keep JSON as the main local storage format;
- build UI pages from normalized JSON;
- avoid introducing extra persistence complexity.

### 4. Feed Parsing

Do not assume all XML/feed sources have the same structure.

Always account for:

- RSS / Atom / RDF differences;
- namespaces and extension fields;
- missing fields;
- partially populated items;
- feeds with no items;
- HTML/non-feed URLs in the source list.

### 5. Rendering

UI must render only data that is actually present.

Never invent missing values.

If a field is unavailable:

- omit it from the UI;
- keep the page stable and readable.

## Current Product Direction

The target UI is multi-page:

- spaces index page;
- per-space detail page;
- global feed page sorted by date descending.

## Change Discipline

Before implementing a new behavior:

1. define the view-model or output contract;
2. write tests for that contract;
3. implement the minimum code;
4. verify with real data after tests pass.
