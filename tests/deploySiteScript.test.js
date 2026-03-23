import { chmodSync, copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const tempDirs = [];

afterEach(() => {
  tempDirs.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

describe("deploy-site.sh", () => {
  it("deploys existing dist without running build by default", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    const stdout = runScript(rootDir, [], logPath);

    expect(readLog(logPath)).toEqual([
      `sudo rsync -av --delete ${rootDir}/dist/ ${rootDir}/target/`,
      "sudo systemctl reload nginx",
    ]);
    expect(stdout).toMatch(/Completed deploy in \d+s/);
  });

  it("runs npm run build before deploy when called with build flag", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    const stdout = runScript(rootDir, ["build"], logPath);

    expect(readLog(logPath)).toEqual([
      "npm run build",
      `sudo rsync -av --delete ${rootDir}/dist/ ${rootDir}/target/`,
      "sudo systemctl reload nginx",
    ]);
    expect(stdout).toMatch(/Completed build deploy in \d+s/);
  });

  it("runs npm run render before deploy when called with render flag", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    const stdout = runScript(rootDir, ["render"], logPath);

    expect(readLog(logPath)).toEqual([
      "npm run render",
      `sudo rsync -av --delete ${rootDir}/dist/ ${rootDir}/target/`,
      "sudo systemctl reload nginx",
    ]);
    expect(stdout).toMatch(/Completed render deploy in \d+s/);
  });
});

function createFixtureProject() {
  const rootDir = mkdtempSync(join(tmpdir(), "hnf-deploy-"));
  tempDirs.push(rootDir);

  mkdirSync(join(rootDir, "scripts"), { recursive: true });
  mkdirSync(join(rootDir, "dist"), { recursive: true });
  mkdirSync(join(rootDir, "target"), { recursive: true });
  mkdirSync(join(rootDir, "bin"), { recursive: true });

  copyFileSync(
    resolve(process.cwd(), "scripts/deploy-site.sh"),
    join(rootDir, "scripts/deploy-site.sh"),
  );
  chmodSync(join(rootDir, "scripts/deploy-site.sh"), 0o755);

  writeExecutable(
    join(rootDir, "bin/npm"),
    `#!/usr/bin/env bash
set -euo pipefail
echo "npm $*" >> "$DEPLOY_SCRIPT_TEST_LOG"
`,
  );

  writeExecutable(
    join(rootDir, "bin/sudo"),
    `#!/usr/bin/env bash
set -euo pipefail
echo "sudo $*" >> "$DEPLOY_SCRIPT_TEST_LOG"
"$@"
`,
  );

  writeExecutable(
    join(rootDir, "bin/rsync"),
    `#!/usr/bin/env bash
set -euo pipefail
exit 0
`,
  );

  writeExecutable(
    join(rootDir, "bin/systemctl"),
    `#!/usr/bin/env bash
set -euo pipefail
exit 0
`,
  );

  return rootDir;
}

function runScript(rootDir, args, logPath) {
  return execFileSync(join(rootDir, "scripts/deploy-site.sh"), args, {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${join(rootDir, "bin")}:${process.env.PATH}`,
      TARGET_DIR: `${join(rootDir, "target")}`,
      DEPLOY_SCRIPT_TEST_LOG: logPath,
    },
    stdio: "pipe",
  });
}

function readLog(logPath) {
  return readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean);
}

function writeExecutable(path, body) {
  writeFileSync(path, body, "utf8");
  chmodSync(path, 0o755);
}
