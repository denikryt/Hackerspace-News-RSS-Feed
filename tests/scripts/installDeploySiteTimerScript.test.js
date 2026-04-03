import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDirSync } from "../_shared/tempDirs.js";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
});

describe("install-deploy-site-timer.sh", () => {
  it("enables the timer without starting the deploy service immediately", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    runScript(rootDir, logPath);

    const logLines = readLog(logPath);

    expect(logLines).toContain("sudo systemctl daemon-reload");
    expect(logLines).toContain("sudo systemctl enable --now hackerspace-news-feed-deploy.timer");
    expect(logLines).not.toContain("sudo systemctl start hackerspace-news-feed-deploy.service");
    expect(logLines).toContain("sudo systemctl status hackerspace-news-feed-deploy.timer --no-pager");
    expect(logLines).not.toContain("sudo systemctl status hackerspace-news-feed-deploy.service --no-pager");
    expect(readFileSync(join(rootDir, "etc/systemd/system/hackerspace-news-feed-deploy.service"), "utf8")).toContain("ExecStart=");
    expect(readFileSync(join(rootDir, "etc/systemd/system/hackerspace-news-feed-deploy.timer"), "utf8")).toContain("OnCalendar=hourly");
  });

  it("writes the deploy service with the discovery-valid build flag when explicitly enabled", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    runScript(rootDir, logPath, ["--include-discovery-valid"]);

    expect(readFileSync(join(rootDir, "etc/systemd/system/hackerspace-news-feed-deploy.service"), "utf8")).toContain(
      "ExecStart=" + join(rootDir, "scripts/deploy-site.sh").replace(/ /g, "\\ ") + " build --include-discovery-valid",
    );
  });

  it("writes the deploy service without the discovery-valid build flag when explicitly disabled", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    runScript(rootDir, logPath, ["--no-include-discovery-valid"]);

    expect(readFileSync(join(rootDir, "etc/systemd/system/hackerspace-news-feed-deploy.service"), "utf8")).toContain(
      "ExecStart=" + join(rootDir, "scripts/deploy-site.sh").replace(/ /g, "\\ ") + " build",
    );
    expect(readFileSync(join(rootDir, "etc/systemd/system/hackerspace-news-feed-deploy.service"), "utf8")).not.toContain(
      "--include-discovery-valid",
    );
  });

  it("prints help and does not install anything", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    const stdout = runScript(rootDir, logPath, ["--help"]);

    expect(stdout).toContain("Install a systemd timer for scheduled deploys.");
    expect(stdout).toContain(
      "Usage: ./scripts/install-deploy-site-timer.sh [--include-discovery-valid|--no-include-discovery-valid]",
    );
    expect(stdout).toContain("Default behavior: schedule `deploy-site.sh build` without discovery-valid rows.");
    expect(stdout).toContain("--include-discovery-valid  Schedule builds with discovery-valid rows included.");
    expect(stdout).toContain("--no-include-discovery-valid  Schedule builds without discovery-valid rows.");
    expect(stdout).toContain("./scripts/install-deploy-site-timer.sh --include-discovery-valid");
    expect(readLog(logPath)).toEqual([]);
  });
});

function createFixtureProject() {
  const rootDir = createTrackedTempDirSync("hnf-install-timer-", tempDirs);

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

if [[ "$1" == "systemctl" ]]; then
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
  writeFileSync(path, body, "utf8");
  chmodSync(path, 0o755);
}

function writeProjectFile(rootDir, relativePath, value) {
  const absolutePath = join(rootDir, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, value, "utf8");
}
