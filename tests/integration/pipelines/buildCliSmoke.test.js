import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, writeFile, symlink, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, expect, it } from "vitest";
import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDir } from "../../_shared/tempDirs.js";
const temporary = createTempDirTracker();
afterEach(() => cleanupTrackedTempDirs(temporary));
// Run the actual npm/CLI/process/snapshot/render flow in a disposable cwd.
// Acquisition is a stream-backed fixture; live endpoints and Docker are absent.
it("runs standalone refresh/render and isolated-process build with discovery, preserving output after failure", async () => {
    const root = await createTrackedTempDir("hnf-cli-smoke-", temporary);
    const repository = process.cwd();
    await mkdir(resolve(root, "content"));
    await cp(resolve(repository, "content/about.html"), resolve(root, "content/about.html"));
    await cp(resolve(repository, "src"), resolve(root, "src"), { recursive: true });
    await symlink(resolve(repository, "node_modules"), resolve(root, "node_modules"), "dir");
    await cp(resolve(repository, "tsconfig.json"), resolve(root, "tsconfig.json"));
    await cp(resolve(repository, "config"), resolve(root, "config"), { recursive: true });
    await cp(resolve(repository, "static"), resolve(root, "static"), { recursive: true });
    const scripts = Object.fromEntries(["refresh", "render", "build"].map(name => [name, `node ${resolve(root, "src/cli", `${name}.js`)}`]));
    await writeFile(resolve(root, "package.json"), JSON.stringify({ type: "module", scripts }));
    await writeFile(resolve(root, "content/rss_feeds.json"), JSON.stringify({ items: [{ rowNumber: 100, hackerspaceName: "Discovery", website: "https://discovery.example/", feedUrl: "https://discovery.example/feed", hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Discovery", country: "Germany" }] }));
    const wiki = await readFile(resolve(repository, "tests/fixtures/source-page/user-jomat-oldid-94788-snippet.html"), "utf8");
    const preload = resolve(root, "acquisition.mjs");
    const rss = `<rss version="2.0"><channel><title>Fixture</title><link>https://example.test</link><description>fixture</description><item><guid>keep</guid><title>Kept article</title><link>https://example.test/keep</link><pubDate>Thu, 01 Jan 2026 12:00:00 GMT</pubDate><description>${"x".repeat(1096)}</description></item></channel></rss>`;
    await writeFile(preload, `
    globalThis.fetch = async url => {
      if (String(url).includes('wiki.hackerspaces.org/User')) {
        if (process.env.SMOKE_FAIL_WIKI === '1') throw new Error('private remote text');
        return new Response(${JSON.stringify(wiki)}, {headers:{'content-type':'text/html'}});
      }
      return new Response(${JSON.stringify(rss)}, {headers:{'content-type':'application/rss+xml'}});
    };
    if (process.argv[1]?.includes('/src/cli/')) process.once('exit', () => console.log('CLI_MEASUREMENT ' + JSON.stringify({pid:process.pid,stage:process.argv[1],peakRssMiB:process.resourceUsage().maxRSS/1024})));
  `);
    const run = (command, args = [], extraEnv = {}) => execFileSync("npm", ["run", command, "--", ...args], { cwd: root, encoding: "utf8", env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --import=${preload}`, ...extraEnv }, timeout: 30000, stdio: "pipe" });
    run("refresh");
    let snapshot = JSON.parse(await readFile(resolve(root, "data/feeds_normalized.json"), "utf8"));
    const beforeCount = snapshot.feeds.length;
    expect(snapshot.feeds[0].items[0].guid).toBe("keep");
    expect(Array.from(snapshot.feeds[0].items[0].summaryText)).toHaveLength(1095);
    run("render");
    const stdout = run("build", ["--include-discovery-valid"]);
    const stages = stdout.split("\n").filter(line => line.startsWith("CLI_MEASUREMENT ")).map(line => JSON.parse(line.slice(16)));
    expect(stages.map(row => row.stage.split("/").at(-1))).toEqual(["refresh.js", "refreshCurated.js", "render.js", "build.js"]);
    expect(new Set(stages.map(row => row.pid)).size).toBe(4);
    snapshot = JSON.parse(await readFile(resolve(root, "data/feeds_normalized.json"), "utf8"));
    expect(snapshot.feeds).toHaveLength(beforeCount + 1);
    const fallbackOutput = run("build", ["--include-discovery-valid"], { SMOKE_FAIL_WIKI: "1" });
    expect(fallbackOutput).toContain("using saved source registry");
    snapshot = JSON.parse(await readFile(resolve(root, "data/feeds_normalized.json"), "utf8"));
    expect(snapshot.feeds).toHaveLength(beforeCount + 1);
    await unlink(resolve(root, "data/source_urls.json"));
    const coldFallbackOutput = run("build", [], { SMOKE_FAIL_WIKI: "1" });
    expect(coldFallbackOutput).toContain("using bundled RSS registry");
    expect(JSON.parse(await readFile(resolve(root, "data/source_urls.json"), "utf8")).urls).toHaveLength(1);
    const published = await readFile(resolve(root, "dist/index.html"), "utf8");
    expect(published).toContain("Discovery");

    await unlink(resolve(root, "data/source_urls.json"));
    await unlink(resolve(root, "content/rss_feeds.json"));
    expect(() => run("build", [], { SMOKE_FAIL_WIKI: "1" })).toThrow();
    expect(await readFile(resolve(root, "dist/index.html"), "utf8")).toBe(published);
    console.log(JSON.stringify({ fixtureCliStages: stages }));
}, 60000);
