import { describe, expect, it, vi } from "vitest";

import { loadAnalysisSourceRows } from "../../src/analysisSourceRows.js";

describe("loadAnalysisSourceRows", () => {
  it("returns only wiki rows by default", async () => {
    const fetchPageHtmlImpl = vi.fn().mockResolvedValue("<html>source</html>");
    const extractSourceRowsImpl = vi.fn().mockReturnValue([
      {
        rowNumber: 1,
        hackerspaceName: "Wiki Alpha",
        candidateFeedUrl: "https://alpha.example/feed.xml",
      },
    ]);
    const readJsonImpl = vi.fn();

    const result = await loadAnalysisSourceRows({
      sourcePageUrl: "https://wiki.example/source",
      fetchPageHtmlImpl,
      extractSourceRowsImpl,
      readJsonImpl,
      includeDiscoveryValid: false,
      paths: {
        discoveredValidSourceRows: "/tmp/content/discovered_valid_source_urls.json",
      },
    });

    expect(readJsonImpl).not.toHaveBeenCalled();
    expect(result).toEqual({
      sourceRows: [
        {
          rowNumber: 1,
          hackerspaceName: "Wiki Alpha",
          candidateFeedUrl: "https://alpha.example/feed.xml",
        },
      ],
      selectedSourceMode: "wiki",
      wikiSourceCount: 1,
      discoveryValidSourceCount: 0,
      dedupedSourceCount: 1,
    });
  });

  it("adds discovery-valid rows from the configured artifact path and dedupes by candidate feed url", async () => {
    const fetchPageHtmlImpl = vi.fn().mockResolvedValue("<html>source</html>");
    const extractSourceRowsImpl = vi.fn().mockReturnValue([
      {
        rowNumber: 1,
        hackerspaceName: "Wiki Alpha",
        candidateFeedUrl: "https://alpha.example/feed.xml",
      },
      {
        rowNumber: 2,
        hackerspaceName: "Wiki Beta",
        candidateFeedUrl: "https://beta.example/feed.xml",
      },
    ]);
    const readJsonImpl = vi.fn().mockResolvedValue({
      urls: [
        {
          hackerspaceName: "Discovery Alpha",
          candidateFeedUrl: "https://alpha.example/feed.xml",
          sourceType: "discovery",
        },
        {
          hackerspaceName: "Discovery Gamma",
          candidateFeedUrl: "https://gamma.example/feed.xml",
          sourceType: "discovery",
        },
      ],
    });
    const paths = {
      discoveredValidSourceRows: "/tmp/content/discovered_valid_source_urls.json",
    };

    const result = await loadAnalysisSourceRows({
      sourcePageUrl: "https://wiki.example/source",
      fetchPageHtmlImpl,
      extractSourceRowsImpl,
      readJsonImpl,
      includeDiscoveryValid: true,
      paths,
    });

    expect(readJsonImpl).toHaveBeenCalledWith(paths.discoveredValidSourceRows);
    expect(result).toEqual({
      sourceRows: [
        expect.objectContaining({
          hackerspaceName: "Wiki Alpha",
          candidateFeedUrl: "https://alpha.example/feed.xml",
        }),
        expect.objectContaining({
          hackerspaceName: "Wiki Beta",
          candidateFeedUrl: "https://beta.example/feed.xml",
        }),
        expect.objectContaining({
          hackerspaceName: "Discovery Gamma",
          candidateFeedUrl: "https://gamma.example/feed.xml",
          sourceType: "discovery",
        }),
      ],
      selectedSourceMode: "wiki+discovery-valid",
      wikiSourceCount: 2,
      discoveryValidSourceCount: 2,
      dedupedSourceCount: 3,
    });
  });
});
