import { describe, expect, it, vi } from "vitest";
import { loadRssSourceRows, updateRssFeedRegistry } from "../../src/rssFeedRegistry.js";

const paths = { rssFeeds: "/content/rss_feeds.json" };
const entry = { hackerspaceName: "Alpha", country: "France", website: "https://alpha.example/", feedUrl: "https://alpha.example/feed" };
describe("public RSS registry", () => {
  it("requires descriptive metadata but does not require a wiki URL", async () => {
    const readJsonImpl = vi.fn().mockResolvedValue({ items: [entry] });
    expect(await loadRssSourceRows({ includeDiscoveryValid: true, readJsonImpl, paths })).toEqual([
      { hackerspaceName: "Alpha", country: "France", siteUrl: entry.website, candidateFeedUrl: entry.feedUrl },
    ]);
  });
  it("does not read an opt-in registry when disabled", async () => {
    const readJsonImpl = vi.fn();
    expect(await loadRssSourceRows({ readJsonImpl, paths })).toEqual([]);
    expect(readJsonImpl).not.toHaveBeenCalled();
  });
  it.each(["hackerspaceName", "country", "website", "feedUrl"])("rejects a missing or blank %s", async key => {
    for (const value of [undefined, "", "  ", 123]) {
      await expect(loadRssSourceRows({ includeDiscoveryValid: true, paths,
        readJsonImpl: async () => ({ items: [{ ...entry, [key]: value }] }),
      })).rejects.toThrow(key);
    }
  });
  it.each([{}, { items: {} }, { items: [null] }])("rejects invalid registry shapes: %j", async payload => {
    await expect(loadRssSourceRows({ includeDiscoveryValid: true, paths, readJsonImpl: async () => payload })).rejects.toThrow(/RSS registry/);
  });
  it("preserves manual edits when discovery supplies updated and new entries", async () => {
    const extra = { ...entry, hackerspaceName: "Beta", website: "https://beta.example", feedUrl: "https://beta.example/feed" };
    const writeJsonImpl = vi.fn();
    const result = await updateRssFeedRegistry({ filePath: paths.rssFeeds,
      newItems: [{ ...entry, hackerspaceName: "Discovered Alpha" }, extra],
      readJsonImpl: async () => ({ items: [entry] }), writeJsonImpl,
    });
    expect(result).toEqual({ items: [entry, extra] });
    expect(writeJsonImpl).toHaveBeenCalledWith(paths.rssFeeds, result);
  });
  it("creates a registry on first discovery", async () => {
    expect(await updateRssFeedRegistry({ filePath: paths.rssFeeds, newItems: [entry],
      readJsonImpl: async () => { throw Object.assign(new Error("missing"), { code: "ENOENT" }); }, writeJsonImpl: vi.fn(),
    })).toEqual({ items: [entry] });
  });
  it("does not overwrite a corrupt manual registry", async () => {
    const writeJsonImpl = vi.fn();
    await expect(updateRssFeedRegistry({ filePath: paths.rssFeeds, newItems: [entry],
      readJsonImpl: async () => ({ items: [{}] }), writeJsonImpl,
    })).rejects.toThrow(/hackerspaceName/);
    expect(writeJsonImpl).not.toHaveBeenCalled();
  });
});
