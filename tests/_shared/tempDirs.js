import { mkdtempSync } from "node:fs";
import { rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

// Keep temp directory ownership explicit per test file while centralizing cleanup.
export function createTempDirTracker() {
  return [];
}

// Create and register an async temp directory under the OS temp root.
export async function createTrackedTempDir(prefix, trackedDirs) {
  const directory = await mkdtemp(resolve(tmpdir(), prefix));
  trackedDirs.push(directory);
  return directory;
}

// Create and register a sync temp directory for script tests that stay synchronous.
export function createTrackedTempDirSync(prefix, trackedDirs) {
  const directory = mkdtempSync(resolve(tmpdir(), prefix));
  trackedDirs.push(directory);
  return directory;
}

// Remove every tracked directory and reset the tracker for the next test.
export async function cleanupTrackedTempDirs(trackedDirs) {
  await Promise.all(trackedDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
}
