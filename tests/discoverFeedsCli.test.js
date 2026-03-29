import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runDiscoverFeedsCli } from "../src/cli/discoverFeeds.js";

const tempDirs = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("runDiscoverFeedsCli", () => {
  it("writes the discovery file and prints a short summary", async () => {
    const outputDir = await mkdtemp(resolve(tmpdir(), "hnf-discover-cli-"));
    tempDirs.push(outputDir);

    const discoveredHackerspaceSourceSnapshot = resolve(outputDir, "data/discovery/list_of_hacker_spaces.html");
    const discoveredHackerspaceFeeds = resolve(outputDir, "data/discovery/discovered_hackerspace_feeds.json");
    const stdout = [];
    const logger = vi.fn((line) => stdout.push(line));

    await runDiscoverFeedsCli({
      logger,
      discoverImpl: vi.fn().mockResolvedValue({
        discoveryPayload: {
          summary: {
            sites: 2,
            confirmed: 1,
            valid: 1,
            empty: 0,
            invalid: 0,
            notFound: 1,
            failed: 0,
          },
        },
      }),
      paths: { discoveredHackerspaceSourceSnapshot, discoveredHackerspaceFeeds },
    });

    expect(logger).toHaveBeenCalledWith(`Wrote ${discoveredHackerspaceSourceSnapshot}`);
    expect(logger).toHaveBeenCalledWith(`Wrote ${discoveredHackerspaceFeeds}`);
    expect(stdout.join("\n")).toContain("Discovery completed: sites=2 confirmed=1 valid=1");
  });
});
