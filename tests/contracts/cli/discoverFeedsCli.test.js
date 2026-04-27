import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDir } from "../../_shared/tempDirs.js";

import { runDiscoverFeedsCli } from "../../../src/cli/discoverFeeds.js";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
});

describe("runDiscoverFeedsCli", () => {
  it("writes the discovery file and prints a short summary", async () => {
    const outputDir = await createTrackedTempDir("hnf-discover-cli-", tempDirs);

    const discoveredHackerspaceSourceSnapshot = resolve(outputDir, "data/discovery/list_of_hacker_spaces.html");
    const discoveredHackerspaceFeeds = resolve(outputDir, "data/discovery/discovered_hackerspace_feeds.json");
    const stdout = [];
    const logger = vi.fn((line) => stdout.push(line));

    const discoveredValidSourceRows = resolve(outputDir, "content/discovered_valid_source_urls.json");

    await runDiscoverFeedsCli({
      logger,
      discoverImpl: vi.fn().mockResolvedValue({
        discoveryPayload: {
          sourcePageUrl: "https://wiki.hackerspaces.org/List_of_Hacker_Spaces",
          generatedAt: "2026-01-01T00:00:00.000Z",
          summary: {
            sites: 2,
            confirmed: 1,
            valid: 1,
            empty: 0,
            invalid: 0,
            notFound: 1,
            failed: 0,
          },
          groupedByValidationStatus: { valid: [], empty: [], invalid: [], unreachable: [], not_checked: [] },
        },
      }),
      paths: { discoveredHackerspaceSourceSnapshot, discoveredHackerspaceFeeds, discoveredValidSourceRows },
    });

    expect(logger).toHaveBeenCalledWith(`Wrote ${discoveredHackerspaceSourceSnapshot}`);
    expect(logger).toHaveBeenCalledWith(`Wrote ${discoveredHackerspaceFeeds}`);
    expect(logger).toHaveBeenCalledWith(`Wrote ${discoveredValidSourceRows}`);
    expect(stdout.join("\n")).toContain("Discovery completed: sites=2 confirmed=1 valid=1");
    expect(stdout.join("\n")).toContain("Discovery valid source list completed: valid=0");
  });
});
