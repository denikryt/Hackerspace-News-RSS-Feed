import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const tempDirs = [];

afterEach(() => {
  tempDirs.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

describe("deploy-site.sh", () => {
  it("uses hackerspace.news as the default target directory", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    runScript(rootDir, [], logPath, {
      TARGET_DIR: undefined,
      SUDO_PASSTHROUGH: "0",
    });

    expect(readLog(logPath)).toContain("sudo mkdir -p /var/www/hackerspace.news");
    expect(readLog(logPath).some((line) => line.includes(" /var/www/hackerspace.news/"))).toBe(true);
  });

  it("deploys existing dist through staged publish and removes stale target artifacts", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    const stdout = runScript(rootDir, [], logPath);
    const logLines = readLog(logPath);
    const prepRsyncIndex = logLines.findIndex((line) => line.startsWith("sudo rsync -a --delete ") && line.includes("/dist/ "));
    const publishRsyncIndex = logLines.findIndex((line) => line.startsWith("sudo rsync -a --delete ") && line.includes("/target/"));
    const reloadIndex = logLines.findIndex((line) => line === "sudo systemctl reload nginx");

    expect(prepRsyncIndex).toBeGreaterThan(-1);
    expect(publishRsyncIndex).toBeGreaterThan(prepRsyncIndex);
    expect(reloadIndex).toBeGreaterThan(publishRsyncIndex);
    expect(readFileSync(join(rootDir, "target/index.html"), "utf8")).toContain("fresh build");
    expect(readFileSync(join(rootDir, "target/favicon.png"), "utf8")).toBe("png");
    expect(existsSync(join(rootDir, "target/stale.txt"))).toBe(false);
    expect(stdout).toContain(`Deploy sync result: 2/2 files present in ${join(rootDir, "target")}`);
    expect(stdout).toMatch(/Completed deploy in \d+s/);
  });

  it("does not publish or reload when build mode fails", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    const error = runScriptExpectFailure(rootDir, ["build"], logPath, {
      NPM_STUB_EXIT_CODE: "1",
    });

    expect(error.status).toBe(1);
    expect(readLog(logPath)).toEqual(["npm run build"]);
    expect(readFileSync(join(rootDir, "target/index.html"), "utf8")).toContain("old target");
    expect(existsSync(join(rootDir, "target/stale.txt"))).toBe(true);
  });

  it("passes the discovery-valid flag through to npm run build in build mode", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    runScript(rootDir, ["build", "--include-discovery-valid"], logPath);

    expect(readLog(logPath)[0]).toBe("npm run build -- --include-discovery-valid");
  });

  it("does not publish or reload when required build artifacts are missing", () => {
    const rootDir = createFixtureProject({
      distFiles: {
        "favicon.png": "png",
      },
    });
    const logPath = join(rootDir, "commands.log");

    const error = runScriptExpectFailure(rootDir, [], logPath);

    expect(error.stdout).toContain("Build output missing required file");
    expect(readLog(logPath)).toEqual([]);
    expect(readFileSync(join(rootDir, "target/index.html"), "utf8")).toContain("old target");
    expect(existsSync(join(rootDir, "target/stale.txt"))).toBe(true);
  });

  it("runs npm run render before staged publish in render mode", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    const stdout = runScript(rootDir, ["render"], logPath);

    expect(readLog(logPath)[0]).toBe("npm run render");
    expect(readFileSync(join(rootDir, "target/index.html"), "utf8")).toContain("fresh build");
    expect(stdout).toMatch(/Completed render deploy in \d+s/);
  });

  it("accepts the discovery-valid flag but does not pass it to render mode", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    runScript(rootDir, ["render", "--include-discovery-valid"], logPath);

    expect(readLog(logPath)[0]).toBe("npm run render");
  });

  it("prints help and does not run deployment commands", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    const stdout = runScript(rootDir, ["--help"], logPath);

    expect(stdout).toContain("Deploy the current dist or run build/render before deploy.");
    expect(stdout).toContain("Usage: ./scripts/deploy-site.sh [build|render] [--include-discovery-valid]");
    expect(stdout).toContain("Default behavior: deploy the existing `dist/` contents.");
    expect(stdout).toContain("build   Run `npm run build` before deploy.");
    expect(stdout).toContain("render  Run `npm run render` before deploy.");
    expect(stdout).toContain("--include-discovery-valid  Pass the discovery-valid flag through to build mode.");
    expect(stdout).toContain("./scripts/deploy-site.sh build --include-discovery-valid");
    expect(readLog(logPath)).toEqual([]);
  });
});

function createFixtureProject({
  distFiles = {
    "index.html": "<html>fresh build</html>",
    "favicon.png": "png",
  },
  targetFiles = {
    "index.html": "<html>old target</html>",
    "stale.txt": "stale",
  },
} = {}) {
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

  for (const [relativePath, value] of Object.entries(distFiles)) {
    writeProjectFile(rootDir, join("dist", relativePath), value);
  }

  for (const [relativePath, value] of Object.entries(targetFiles)) {
    writeProjectFile(rootDir, join("target", relativePath), value);
  }

  writeExecutable(
    join(rootDir, "bin/npm"),
    `#!/usr/bin/env bash
set -euo pipefail
echo "npm $*" >> "$DEPLOY_SCRIPT_TEST_LOG"
if [[ -n "\${NPM_STUB_EXIT_CODE:-}" ]]; then
  exit "$NPM_STUB_EXIT_CODE"
fi
`,
  );

  writeExecutable(
    join(rootDir, "bin/sudo"),
    `#!/usr/bin/env bash
set -euo pipefail
echo "sudo $*" >> "$DEPLOY_SCRIPT_TEST_LOG"
if [[ "\${SUDO_PASSTHROUGH:-1}" != "1" ]]; then
  exit 0
fi
"$@"
`,
  );

  writeExecutable(
    join(rootDir, "bin/rsync"),
    `#!/usr/bin/env bash
set -euo pipefail
args=("$@")
src="\${args[$((\${#args[@]} - 2))]}"
dst="\${args[$((\${#args[@]} - 1))]}"
src="\${src%/}"
dst="\${dst%/}"
mkdir -p "$dst"
find "$dst" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
if [[ -d "$src" ]]; then
  cp -a "$src"/. "$dst"/
else
  cp -a "$src" "$dst"
fi
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
  const env = {
    ...process.env,
    PATH: `${join(rootDir, "bin")}:${process.env.PATH}`,
    DEPLOY_SCRIPT_TEST_LOG: logPath,
    TARGET_DIR: join(rootDir, "target"),
    ...extraEnv,
  };

  if (Object.hasOwn(extraEnv, "TARGET_DIR") && extraEnv.TARGET_DIR === undefined) {
    delete env.TARGET_DIR;
  }

  return env;
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
