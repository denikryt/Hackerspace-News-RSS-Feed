import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { slugify } from "./utils/slugify.js";

const EXCLUDED_AUTHOR_NAMES_PATH = resolve(process.cwd(), "config/excluded_author_names.txt");

export function getExcludedAuthorNames() {
  return readFileSync(EXCLUDED_AUTHOR_NAMES_PATH, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

export function isExcludedAuthorName(name, excludedAuthorNames = getExcludedAuthorNames()) {
  const normalizedName = normalizeAuthorName(name);
  if (!normalizedName) {
    return true;
  }

  const excludedNames = new Set(excludedAuthorNames.map(normalizeAuthorName).filter(Boolean));
  return excludedNames.has(normalizedName);
}

export function createAuthorSlugBase(name) {
  return slugify(name) || "author";
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

function normalizeAuthorName(name) {
  return String(name || "").trim().toLowerCase();
}
