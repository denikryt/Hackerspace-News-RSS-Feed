import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDirSync } from "../_shared/tempDirs.js";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
});

describe("install-deploy-site-timer.sh", () => {
  it("removes the legacy host-copy units and enables the container deploy timer", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    runScript(rootDir, logPath);

    const logLines = readLog(logPath);

    expect(logLines).toContain("sudo systemctl disable --now hackerspace-news-feed-deploy.timer");
    expect(logLines).toContain("sudo systemctl stop hackerspace-news-feed-deploy.service");
    expect(logLines).toContain("sudo rm -f /etc/systemd/system/hackerspace-news-feed-deploy.service /etc/systemd/system/hackerspace-news-feed-deploy.timer");
    expect(logLines).toContain("sudo systemctl enable --now hackerspace-news-feed-container-deploy.timer");
    expect(logLines).not.toContain("sudo systemctl enable --now hackerspace-news-feed-deploy.timer");
  });

  it("writes the container deploy service without starting it immediately", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    runScript(rootDir, logPath);

    const service = readFileSync(
      join(rootDir, "etc/systemd/system/hackerspace-news-feed-container-deploy.service"),
      "utf8",
    );
    const timer = readFileSync(join(rootDir, "etc/systemd/system/hackerspace-news-feed-container-deploy.timer"), "utf8");

    expect(service).toContain("Description=Deploy Hackerspace News Feed Docker static site");
    expect(service).toContain("WorkingDirectory=" + rootDir.replace(/ /g, "\\ "));
    expect(service).toContain("ExecStart=" + join(rootDir, "scripts/deploy-site.sh").replace(/ /g, "\\ ") + " build");
    expect(service).toContain("NoNewPrivileges=true");
    expect(service).toContain("PrivateTmp=true");
    expect(timer).toContain("OnCalendar=hourly");
    expect(readLog(logPath)).not.toContain("sudo systemctl start hackerspace-news-feed-container-deploy.service");
  });

  it("writes the container deploy service with the discovery-valid build flag when explicitly enabled", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    runScript(rootDir, logPath, ["--include-discovery-valid"]);

    expect(readFileSync(join(rootDir, "etc/systemd/system/hackerspace-news-feed-container-deploy.service"), "utf8")).toContain(
      "ExecStart=" + join(rootDir, "scripts/deploy-site.sh").replace(/ /g, "\\ ") + " build --include-discovery-valid",
    );
  });

  it("prints help and does not install anything", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    const stdout = runScript(rootDir, logPath, ["--help"]);

    expect(stdout).toContain("Install a systemd timer for Docker-based scheduled deploys.");
    expect(stdout).toContain(
      "Usage: ./scripts/install-deploy-site-timer.sh [--include-discovery-valid|--no-include-discovery-valid]",
    );
    expect(stdout).toContain("Default behavior: schedule containerized `deploy-site.sh build` without discovery-valid rows.");
    expect(stdout).toContain("--include-discovery-valid  Schedule container builds with discovery-valid rows included.");
    expect(readLog(logPath)).toEqual([]);
  });
});

function createFixtureProject() {
  const rootDir = createTrackedTempDirSync("hnf-install-container-timer-", tempDirs);

  mkdirSync(join(rootDir, "scripts"), { recursive: true });
  mkdirSync(join(rootDir, "bin"), { recursive: true });
  mkdirSync(join(rootDir, "etc/systemd/system"), { recursive: true });

  copyFileSync(
    resolve(process.cwd(), "scripts/install-deploy-site-timer.sh"),
    join(rootDir, "scripts/install-deploy-site-timer.sh"),
  );
  chmodSync(join(rootDir, "scripts/install-deploy-site-timer.sh"), 0o755);

  writeExecutable(
    join(rootDir, "scripts/deploy-site.sh"),
    `#!/usr/bin/env bash
set -euo pipefail
exit 0
`,
  );

  writeExecutable(
    join(rootDir, "bin/sudo"),
    `#!/usr/bin/env bash
set -euo pipefail
echo "sudo $*" >> "$DEPLOY_SCRIPT_TEST_LOG"

if [[ "$1" == "tee" ]]; then
  target="$2"
  target="\${target#/etc/systemd/system/}"
  mkdir -p "$SYSTEMD_ROOT"
  cat > "$SYSTEMD_ROOT/$target"
  exit 0
fi

if [[ "$1" == "systemctl" || "$1" == "rm" ]]; then
  exit 0
fi

"$@"
`,
  );

  return rootDir;
}

function runScript(rootDir, logPath, args = []) {
  return execFileSync(join(rootDir, "scripts/install-deploy-site-timer.sh"), args, {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${join(rootDir, "bin")}:${process.env.PATH}`,
      DEPLOY_SCRIPT_TEST_LOG: logPath,
      SYSTEMD_ROOT: join(rootDir, "etc/systemd/system"),
    },
    stdio: "pipe",
  });
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
