import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDirSync } from "../_shared/tempDirs.js";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
});

describe("deploy-site.sh", () => {
  it("builds the container images, publishes a fresh site volume, and starts the web container", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    const stdout = runScript(rootDir, ["build"], logPath);

    expect(readLog(logPath)).toEqual([
      "docker compose build site-builder site",
      "docker compose run --rm -e SITE_BUILD_MODE=build site-builder",
      "docker compose up -d site",
      "docker compose exec -T site test -f /usr/share/nginx/html/index.html",
      "docker compose exec -T site test -f /usr/share/nginx/html/favicon.png",
      "docker compose exec -T site find /usr/share/nginx/html -type f",
    ]);
    expect(stdout).toContain("Container deploy published 2 files");
    expect(stdout).toMatch(/Completed container build deploy in \d+s/);
  });

  it("runs build mode by default so scheduled deploys always refresh the site", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    runScript(rootDir, [], logPath);

    expect(readLog(logPath)[1]).toBe("docker compose run --rm -e SITE_BUILD_MODE=build site-builder");
  });

  it("passes the discovery-valid flag to the container builder in build mode", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    runScript(rootDir, ["build", "--include-discovery-valid"], logPath);

    expect(readLog(logPath)[1]).toBe(
      "docker compose run --rm -e SITE_BUILD_MODE=build -e SITE_BUILD_ARGS=--include-discovery-valid site-builder",
    );
  });

  it("runs render mode without forwarding build-only discovery flags", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    runScript(rootDir, ["render", "--include-discovery-valid"], logPath);

    expect(readLog(logPath)[1]).toBe("docker compose run --rm -e SITE_BUILD_MODE=render site-builder");
  });

  it("does not start or verify the web container when the builder fails", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    const error = runScriptExpectFailure(rootDir, ["build"], logPath, {
      DOCKER_STUB_FAIL_ON: "run",
    });

    expect(error.status).toBe(1);
    expect(readLog(logPath)).toEqual([
      "docker compose build site-builder site",
      "docker compose run --rm -e SITE_BUILD_MODE=build site-builder",
    ]);
  });

  it("prints help and does not run deployment commands", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    const stdout = runScript(rootDir, ["--help"], logPath);

    expect(stdout).toContain("Build and publish the static site through Docker Compose.");
    expect(stdout).toContain("Usage: ./scripts/deploy-site.sh [build|render] [--include-discovery-valid]");
    expect(stdout).toContain("Default behavior: build and publish the site into the Docker web volume.");
    expect(stdout).toContain("build   Run npm build inside the site-builder container.");
    expect(stdout).toContain("render  Run npm render inside the site-builder container.");
    expect(stdout).toContain("--include-discovery-valid  Pass the discovery-valid flag through to build mode.");
    expect(readLog(logPath)).toEqual([]);
  });
});

function createFixtureProject() {
  const rootDir = createTrackedTempDirSync("hnf-container-deploy-", tempDirs);

  mkdirSync(join(rootDir, "scripts"), { recursive: true });
  mkdirSync(join(rootDir, "bin"), { recursive: true });

  copyFileSync(resolve(process.cwd(), "scripts/deploy-site.sh"), join(rootDir, "scripts/deploy-site.sh"));
  chmodSync(join(rootDir, "scripts/deploy-site.sh"), 0o755);

  writeExecutable(
    join(rootDir, "bin/docker"),
    `#!/usr/bin/env bash
set -euo pipefail
echo "docker $*" >> "$DEPLOY_SCRIPT_TEST_LOG"
if [[ "\${DOCKER_STUB_FAIL_ON:-}" == "run" && "$*" == compose\\ run* ]]; then
  exit 1
fi
if [[ "$*" == compose\\ exec\\ -T\\ site\\ find* ]]; then
  printf '/usr/share/nginx/html/index.html\\n/usr/share/nginx/html/favicon.png\\n'
fi
`,
  );

  return rootDir;
}

function runScript(rootDir, args, logPath, extraEnv = {}) {
  const env = buildEnv(rootDir, logPath, extraEnv);

  return execFileSync(join(rootDir, "scripts/deploy-site.sh"), args, {
    cwd: rootDir,
    encoding: "utf8",
    env,
    stdio: "pipe",
  });
}

function runScriptExpectFailure(rootDir, args, logPath, extraEnv = {}) {
  const env = buildEnv(rootDir, logPath, extraEnv);

  try {
    execFileSync(join(rootDir, "scripts/deploy-site.sh"), args, {
      cwd: rootDir,
      encoding: "utf8",
      env,
      stdio: "pipe",
    });
  } catch (error) {
    return error;
  }

  throw new Error("Expected deploy script to fail");
}

function buildEnv(rootDir, logPath, extraEnv) {
  return {
    ...process.env,
    PATH: `${join(rootDir, "bin")}:${process.env.PATH}`,
    DEPLOY_SCRIPT_TEST_LOG: logPath,
    ...extraEnv,
  };
}

function readLog(logPath) {
  if (!existsSync(logPath)) {
    return [];
  }

  return readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean);
}

function writeExecutable(path, body) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, "utf8");
  chmodSync(path, 0o755);
}
