import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoPath } from "../_shared/paths.js";

const SCANNED_ROOTS = ["src", "static", "tests", "config"];
const TEXT_FILE_EXTENSIONS = new Set([".js", ".ts", ".tsx", ".json", ".md"]);
const SKIPPED_DIRECTORIES = new Set(["fixtures", "_shared"]);
const SELF_TEST_PATH = "tests/architecture/deadFeedModules.test.js";

const FORBIDDEN_IMPORT_PATTERNS = [
  "./feedSections.js",
  "./countryFeeds.js",
  "./feedSectionCategoryContract.js",
  "./viewModels/feedSections.js",
  "./viewModels/countryFeeds.js",
  "../feedSections.js",
  "../countryFeeds.js",
  "../viewModels/feedSections.js",
  "../viewModels/countryFeeds.js",
];

const FORBIDDEN_OUTPUT_PATH_PATTERNS = [
  '"/feed/index.html"',
  "'/feed/index.html'",
  '"feed/index.html"',
  "'feed/index.html'",
  '"/feed/dates.json"',
  "'/feed/dates.json'",
  '"feed/dates.json"',
  "'feed/dates.json'",
  '"/feed/page/',
  "'/feed/page/",
  '"feed/page/',
  "'feed/page/",
];

describe("dead feed module boundary", () => {
  it("keeps maintained project files free from deleted feed imports and old /feed output paths", () => {
    for (const relativePath of listMaintainedProjectFiles()) {
      const source = readFileSync(resolveRepoPath(relativePath), "utf8");

      for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
        expect(source, `${relativePath} should not import deleted feed modules`).not.toContain(pattern);
      }

      for (const pattern of FORBIDDEN_OUTPUT_PATH_PATTERNS) {
        expect(source, `${relativePath} should not reference old /feed output paths`).not.toContain(pattern);
      }
    }
  });
});

function listMaintainedProjectFiles() {
  return SCANNED_ROOTS.flatMap((root) => listFilesRecursively(root));
}

function listFilesRecursively(relativeDirectory) {
  const absoluteDirectory = resolveRepoPath(relativeDirectory);
  const entries = readdirSync(absoluteDirectory, { withFileTypes: true });
  const files = [];

    for (const entry of entries) {
      const relativePath = join(relativeDirectory, entry.name);
    const absolutePath = resolveRepoPath(relativePath);

    if (entry.isDirectory()) {
      if (relativeDirectory === "tests" && SKIPPED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      files.push(...listFilesRecursively(relativePath));
      continue;
    }

    if (!statSync(absolutePath).isFile()) {
      continue;
    }

    if (!TEXT_FILE_EXTENSIONS.has(extname(entry.name))) {
      continue;
    }

    if (relativePath === SELF_TEST_PATH) {
      continue;
    }

    files.push(relativePath);
  }

  return files.sort();
}
