import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Resolve repository-relative paths from the project root used by the test runner.
export function resolveRepoPath(...segments) {
  return resolve(process.cwd(), ...segments);
}

// Keep fixture lookups stable when tests move across responsibility layers.
export function resolveFixturePath(...segments) {
  return resolveRepoPath("tests", "fixtures", ...segments);
}

// Read text fixtures through one shared entry point for layered tests.
export function readFixtureText(...segments) {
  return readFileSync(resolveFixturePath(...segments), "utf8");
}
