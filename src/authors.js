import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { slugify } from "./utils/slugify.js";

const EXCLUDED_AUTHOR_NAMES_PATH = resolve(process.cwd(), "config/excluded_author_names.txt");
const AUTHOR_OVERRIDES_PATH = resolve(process.cwd(), "config/author_overrides.json");
const CANONICAL_MULTI_AUTHOR_DELIMITER = "|";

export function getExcludedAuthorNames() {
  return readFileSync(EXCLUDED_AUTHOR_NAMES_PATH, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

export function getAuthorOverrides() {
  return JSON.parse(readFileSync(AUTHOR_OVERRIDES_PATH, "utf8"));
}

export function isExcludedAuthorName(name, excludedAuthorNames = getExcludedAuthorNames()) {
  const normalizedName = normalizeAuthorLookupKey(name);
  if (!normalizedName) {
    return true;
  }

  const excludedNames = new Set(excludedAuthorNames.map(normalizeAuthorLookupKey).filter(Boolean));
  return excludedNames.has(normalizedName);
}

export function createAuthorSlugBase(name) {
  return slugify(name) || "author";
}

export function normalizeAuthorDisplayName(name) {
  return String(name || "").trim().replace(/^@+/, "").trim();
}

export function normalizeAuthorLookupKey(name) {
  return normalizeAuthorDisplayName(name).toLowerCase();
}

export function parseAuthorValue(rawAuthor, { authorOverrides = getAuthorOverrides() } = {}) {
  const normalizedAuthorDisplay = normalizeAuthorDisplayName(rawAuthor);

  if (!normalizedAuthorDisplay) {
    return {
      rawAuthor: String(rawAuthor || ""),
      normalizedAuthorDisplay,
      derivedAuthors: [],
      sourceRule: "empty",
    };
  }

  const overrideAuthors = authorOverrides?.[String(rawAuthor || "").trim()];
  if (overrideAuthors) {
    return {
      rawAuthor: String(rawAuthor || ""),
      normalizedAuthorDisplay,
      derivedAuthors: normalizeDerivedAuthors(overrideAuthors),
      sourceRule: "override",
    };
  }

  if (normalizedAuthorDisplay.includes(CANONICAL_MULTI_AUTHOR_DELIMITER)) {
    return {
      rawAuthor: String(rawAuthor || ""),
      normalizedAuthorDisplay,
      derivedAuthors: normalizeDerivedAuthors(
        normalizedAuthorDisplay.split(CANONICAL_MULTI_AUTHOR_DELIMITER),
      ),
      sourceRule: "canonical_delimiter",
    };
  }

  return {
    rawAuthor: String(rawAuthor || ""),
    normalizedAuthorDisplay,
    derivedAuthors: [normalizedAuthorDisplay],
    sourceRule: "single_raw",
  };
}

export function getAuthorsIndexHref() {
  return "/authors/index.html";
}

export function getAuthorDetailHref(authorSlug, pageNumber = 1) {
  return pageNumber <= 1
    ? `/authors/${authorSlug}.html`
    : `/authors/${authorSlug}/page/${pageNumber}/`;
}

export function getAuthorDetailOutputPath(authorSlug, pageNumber = 1) {
  return pageNumber <= 1
    ? `authors/${authorSlug}.html`
    : `authors/${authorSlug}/page/${pageNumber}/index.html`;
}

function normalizeDerivedAuthors(values) {
  const uniqueAuthors = new Map();

  for (const value of values || []) {
    const displayName = normalizeAuthorDisplayName(value);
    const lookupKey = normalizeAuthorLookupKey(displayName);

    if (!lookupKey || uniqueAuthors.has(lookupKey)) {
      continue;
    }

    uniqueAuthors.set(lookupKey, displayName);
  }

  return [...uniqueAuthors.values()];
}
