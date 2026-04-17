import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock all renderers and view-model builders so we can spy on call counts.

vi.mock("../../src/authors.js", () => ({
  getAuthorDetailOutputPath: vi.fn((slug, page) =>
    page === 1 ? `authors/${slug}.html` : `authors/${slug}/page/${page}/index.html`,
  ),
}));

vi.mock("../../src/renderers/renderSpaceDetail.js", () => ({
  renderSpaceDetail: vi.fn((model) => `space:${model.slug}:p${model.currentPage}`),
}));

vi.mock("../../src/renderers/renderAuthorDetail.js", () => ({
  renderAuthorDetail: vi.fn((model) => `author:${model.slug}:p${model.currentPage}`),
}));

vi.mock("../../src/renderers/renderAuthorsIndex.js", () => ({
  renderAuthorsIndex: vi.fn(() => "authors-index"),
}));

// spaceSlug "multi" has 2 pages; "single" has 1 page.
const buildSpaceDetailModelMock = vi.fn((displayPayload, spaceSlug, { currentPage = 1 } = {}) => ({
  slug: spaceSlug,
  currentPage,
  totalPages: spaceSlug === "multi" ? 2 : 1,
}));

vi.mock("../../src/viewModels/spaceDetail.js", () => ({
  buildSpaceDetailModel: buildSpaceDetailModelMock,
}));

// authorSlug "multi-author" has 2 pages; "single-author" has 1 page.
const buildAuthorDetailModelMock = vi.fn((displayPayload, authorSlug, { currentPage = 1 } = {}) => ({
  slug: authorSlug,
  currentPage,
  totalPages: authorSlug === "multi-author" ? 2 : 1,
}));

vi.mock("../../src/viewModels/authors.js", () => ({
  buildAuthorDetailModel: buildAuthorDetailModelMock,
  buildAuthorsIndexModel: vi.fn(() => ({ id: "idx", authors: [] })),
}));

const { buildSpacePageEntries, buildAuthorPageEntries } = await import("../../src/renderSitePageBuilders.js");

describe("buildSpacePageEntries call count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls buildSpaceDetailModel exactly totalPages times for a 2-page space (not totalPages+1)", () => {
    buildSpacePageEntries({
      displayPayload: { id: "d" },
      authorDirectory: {},
      spaceSlugs: ["multi"],
    });

    // Before fix: called 3 times (1 extra for getTotalPages + 2 for pages).
    // After fix: called exactly 2 times.
    expect(buildSpaceDetailModelMock).toHaveBeenCalledTimes(2);
    expect(buildSpaceDetailModelMock).toHaveBeenNthCalledWith(
      1, expect.anything(), "multi", expect.objectContaining({ currentPage: 1 }),
    );
    expect(buildSpaceDetailModelMock).toHaveBeenNthCalledWith(
      2, expect.anything(), "multi", expect.objectContaining({ currentPage: 2 }),
    );
  });

  it("calls buildSpaceDetailModel exactly 1 time for a single-page space", () => {
    buildSpacePageEntries({
      displayPayload: { id: "d" },
      authorDirectory: {},
      spaceSlugs: ["single"],
    });

    expect(buildSpaceDetailModelMock).toHaveBeenCalledTimes(1);
  });

  it("produces correct page entries for a 2-page space", () => {
    const entries = buildSpacePageEntries({
      displayPayload: { id: "d" },
      authorDirectory: {},
      spaceSlugs: ["multi"],
    });

    expect(entries).toEqual([
      ["spaces/multi.html", "space:multi:p1"],
      ["spaces/multi/page/2/index.html", "space:multi:p2"],
    ]);
  });
});

describe("buildAuthorPageEntries call count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls buildAuthorDetailModel exactly totalPages times for a 2-page author (not totalPages+1)", () => {
    buildAuthorPageEntries({
      displayPayload: { id: "d" },
      authorDirectory: {},
      authorsIndexModel: {
        id: "idx",
        authors: [{ slug: "multi-author" }],
      },
    });

    // Before fix: called 3 times. After fix: called exactly 2 times.
    expect(buildAuthorDetailModelMock).toHaveBeenCalledTimes(2);
  });

  it("calls buildAuthorDetailModel exactly 1 time for a single-page author", () => {
    buildAuthorPageEntries({
      displayPayload: { id: "d" },
      authorDirectory: {},
      authorsIndexModel: {
        id: "idx",
        authors: [{ slug: "single-author" }],
      },
    });

    expect(buildAuthorDetailModelMock).toHaveBeenCalledTimes(1);
  });
});
