import { chmodSync, copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDirSync } from "../../_shared/tempDirs.js";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
});

describe("render/build timing logs", () => {
  it("logs the next step after refresh completes", () => {
    const rootDir = createCliFixture();

    const stdout = execFileSync(process.execPath, [join(rootDir, "src/cli/refresh.js")], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(stdout).toContain("Refresh completed. Reporting snapshot artifacts.");
    expect(stdout).toContain(`Wrote ${join(rootDir, "data/source_urls.json")}`);
  });

  it("logs render duration after writing pages", () => {
    const rootDir = createCliFixture();

    const stdout = execFileSync(process.execPath, [join(rootDir, "src/cli/render.js")], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(stdout).toContain(`Rendered 2 pages into ${join(rootDir, "dist")}`);
    expect(stdout).not.toContain(`Wrote ${join(rootDir, "dist")}/index.html`);
    expect(stdout).toMatch(/Rendered 2 pages in \d+ms/);
  });

  it("logs page render duration during build", () => {
    const rootDir = createCliFixture();

    const stdout = execFileSync(process.execPath, [join(rootDir, "src/cli/build.js")], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(stdout).toContain("Refresh completed. Starting site render.");
    expect(stdout).toContain(`Wrote ${join(rootDir, "data/source_urls.json")}`);
    expect(stdout).toContain(`Rendered 2 pages into ${join(rootDir, "dist")}`);
    expect(stdout).not.toContain(`Wrote ${join(rootDir, "dist")}/index.html`);
    expect(stdout).toMatch(/Rendered 2 pages in \d+ms/);
  });
});

function createCliFixture() {
  const rootDir = createTrackedTempDirSync("hnf-render-cli-", tempDirs);

  mkdirSync(join(rootDir, "src/cli"), { recursive: true });
  mkdirSync(join(rootDir, "src"), { recursive: true });
  mkdirSync(join(rootDir, "dist"), { recursive: true });
  mkdirSync(join(rootDir, "data"), { recursive: true });

  copyFileSync(resolve(process.cwd(), "src/cli/refresh.js"), join(rootDir, "src/cli/refresh.js"));
  copyFileSync(resolve(process.cwd(), "src/cli/render.js"), join(rootDir, "src/cli/render.js"));
  copyFileSync(resolve(process.cwd(), "src/cli/build.js"), join(rootDir, "src/cli/build.js"));

  writeFileSync(
    join(rootDir, "src/config.js"),
    `export const DIST_DIR = ${JSON.stringify(join(rootDir, "dist"))};
export const PATHS = {
  sourceRows: ${JSON.stringify(join(rootDir, "data/source_urls.json"))},
  validations: ${JSON.stringify(join(rootDir, "data/feed_validation.json"))},
  normalizedFeeds: ${JSON.stringify(join(rootDir, "data/feeds_normalized.json"))},
};\n`,
    "utf8",
  );

  writeFileSync(
    join(rootDir, "src/renderSite.js"),
    `export async function renderSite() {
  return {
    pages: {
      "index.html": "<html></html>",
      "about/index.html": "<html></html>",
    },
  };
}\n`,
    "utf8",
  );

  writeFileSync(
    join(rootDir, "src/refreshDataset.js"),
    `export async function refreshDataset({ logger } = {}) {
  if (logger) {
    logger("[refresh] refresh complete: feeds=1 failures=0");
  }
  return {
    sourceRowsPayload: {},
    validationsPayload: {},
    normalizedPayload: {},
  };
}\n`,
    "utf8",
  );

  writeFileSync(
    join(rootDir, "src/storage.js"),
    `export async function readJson() {
  return { urls: [] };
}\n`,
    "utf8",
  );

  return rootDir;
}
