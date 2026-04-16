import { beforeEach, describe, expect, it, vi } from "vitest";

// Spy on buildDisplayContent to count how many times it is called.
// It must be called exactly feed.items.length times regardless of the number of pages rendered.
vi.mock("../../../src/contentDisplay.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    buildDisplayContent: vi.fn(actual.buildDisplayContent),
  };
});

const { buildDisplayContent } = await import("../../../src/contentDisplay.js");
const { buildSpaceDetailModel } = await import("../../../src/viewModels/spaceDetail.js");
const { buildAuthorDirectory } = await import("../../../src/viewModels/authors.js");

function makeItem(id, date) {
  return {
    id,
    title: `Post ${id}`,
    link: `https://example.com/${id}`,
    resolvedAuthor: "Alice",
    authorSource: "author",
    displayDate: date,
    contentHtml: `<p>Body of <strong>${id}</strong>.</p>`,
  };
}

const payload = {
  generatedAt: "2026-03-22T20:00:00.000Z",
  sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat",
  summary: { sourceRows: 1, validFeeds: 1, parsedFeeds: 1, emptyFeeds: 0, failedFeeds: 0 },
  feeds: [
    {
      id: "feed-1",
      sourceWikiUrl: "https://wiki.hackerspaces.org/PerfSpace",
      finalFeedUrl: "https://perfspace.example.com/feed/",
      siteUrl: "https://perfspace.example.com",
      spaceName: "PerfSpace",
      country: "Germany",
      feedType: "rss",
      status: "parsed_ok",
      // 5 items, pageSize=2 → 3 pages
      items: [
        makeItem("i1", "2025-05-01T10:00:00.000Z"),
        makeItem("i2", "2025-04-01T10:00:00.000Z"),
        makeItem("i3", "2025-03-01T10:00:00.000Z"),
        makeItem("i4", "2025-02-01T10:00:00.000Z"),
        makeItem("i5", "2025-01-01T10:00:00.000Z"),
      ],
    },
  ],
  failures: [],
};

describe("buildSpaceDetailModel buildDisplayContent call count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls buildDisplayContent exactly items.length times when rendering all 3 pages with enrichedItems threading", () => {
    const authorDirectory = buildAuthorDirectory(payload);
    const itemCount = payload.feeds[0].items.length; // 5

    // Reset the spy after building authorDirectory (which also calls buildDisplayContent
    // internally for its own author-linking pass — that cost is separate and pre-existing).
    vi.clearAllMocks();

    // Simulate what buildPaginatedEntityEntries does after the RC-1 fix:
    // page 1 is built first, subsequent pages receive enrichedItems from _enrichedItems.
    const model1 = buildSpaceDetailModel(payload, "perfspace", {
      currentPage: 1,
      pageSize: 2,
      authorDirectory,
    });

    // After the RC-2 fix: subsequent pages must reuse _enrichedItems from page 1.
    const model2 = buildSpaceDetailModel(payload, "perfspace", {
      currentPage: 2,
      pageSize: 2,
      authorDirectory,
      enrichedItems: model1._enrichedItems,
    });

    const model3 = buildSpaceDetailModel(payload, "perfspace", {
      currentPage: 3,
      pageSize: 2,
      authorDirectory,
      enrichedItems: model1._enrichedItems,
    });

    // Each page must have items from the correct slice.
    expect(model1.items).toHaveLength(2);
    expect(model2.items).toHaveLength(2);
    expect(model3.items).toHaveLength(1);

    // buildDisplayContent must be called exactly itemCount times — not 3 × itemCount.
    expect(buildDisplayContent).toHaveBeenCalledTimes(itemCount);
  });

  it("calls buildDisplayContent exactly items.length times for a single-page space", () => {
    const authorDirectory = buildAuthorDirectory(payload);
    const itemCount = payload.feeds[0].items.length;

    // Reset after authorDirectory build so we only count calls from buildSpaceDetailModel.
    vi.clearAllMocks();

    buildSpaceDetailModel(payload, "perfspace", { authorDirectory });

    expect(buildDisplayContent).toHaveBeenCalledTimes(itemCount);
  });
});
