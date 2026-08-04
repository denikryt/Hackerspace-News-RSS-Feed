import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDirSync } from "../_shared/tempDirs.js";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
});

describe("install-nginx-container-proxy.sh", () => {
  it("installs the container proxy server block and reloads nginx after config test", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    runScript(rootDir, logPath);

    expect(readLog(logPath)).toEqual([
      `sudo install -m 0644 ${join(rootDir, "deploy/nginx/hackerspace.news.container.conf")} /etc/nginx/sites-available/hackerspace.news`,
      "sudo ln -sfn /etc/nginx/sites-available/hackerspace.news /etc/nginx/sites-enabled/hackerspace.news",
      "sudo nginx -t",
      "sudo systemctl reload nginx",
    ]);
    expect(readFileSync(join(rootDir, "etc/nginx/sites-available/hackerspace.news"), "utf8")).toContain(
      "proxy_pass http://127.0.0.1:18088;",
    );
  });

  it("prints help and does not install anything", () => {
    const rootDir = createFixtureProject();
    const logPath = join(rootDir, "commands.log");

    const stdout = runScript(rootDir, logPath, ["--help"]);

    expect(stdout).toContain("Install the host nginx reverse proxy for the Docker site container.");
    expect(stdout).toContain("Usage: ./scripts/install-nginx-container-proxy.sh");
    expect(readLog(logPath)).toEqual([]);
  });
});

function createFixtureProject() {
  const rootDir = createTrackedTempDirSync("hnf-install-nginx-proxy-", tempDirs);

  mkdirSync(join(rootDir, "scripts"), { recursive: true });
  mkdirSync(join(rootDir, "deploy/nginx"), { recursive: true });
  mkdirSync(join(rootDir, "bin"), { recursive: true });
  mkdirSync(join(rootDir, "etc/nginx/sites-available"), { recursive: true });
  mkdirSync(join(rootDir, "etc/nginx/sites-enabled"), { recursive: true });

  copyFileSync(
    resolve(process.cwd(), "scripts/install-nginx-container-proxy.sh"),
    join(rootDir, "scripts/install-nginx-container-proxy.sh"),
  );
  chmodSync(join(rootDir, "scripts/install-nginx-container-proxy.sh"), 0o755);
  copyFileSync(
    resolve(process.cwd(), "deploy/nginx/hackerspace.news.container.conf"),
    join(rootDir, "deploy/nginx/hackerspace.news.container.conf"),
  );

  writeExecutable(
    join(rootDir, "bin/sudo"),
    `#!/usr/bin/env bash
set -euo pipefail
echo "sudo $*" >> "$DEPLOY_SCRIPT_TEST_LOG"

if [[ "$1" == "install" ]]; then
  source_path="$4"
  target_path="$NGINX_ROOT\${5#/etc/nginx}"
  mkdir -p "$(dirname "$target_path")"
  cp "$source_path" "$target_path"
  exit 0
fi

if [[ "$1" == "ln" ]]; then
  exit 0
fi

if [[ "$1" == "nginx" || "$1" == "systemctl" ]]; then
  exit 0
fi

"$@"
`,
  );

  return rootDir;
}

function runScript(rootDir, logPath, args = []) {
  return execFileSync(join(rootDir, "scripts/install-nginx-container-proxy.sh"), args, {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${join(rootDir, "bin")}:${process.env.PATH}`,
      DEPLOY_SCRIPT_TEST_LOG: logPath,
      NGINX_ROOT: join(rootDir, "etc/nginx"),
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
