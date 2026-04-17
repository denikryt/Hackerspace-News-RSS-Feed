import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/authors.js", () => ({
  getAuthorDetailOutputPath: vi.fn((authorSlug, currentPage) =>
    currentPage === 1
      ? `authors/${authorSlug}.html`
      : `authors/${authorSlug}/page/${currentPage}/index.html`,
  ),
}));

vi.mock("../../src/renderers/renderSpacesIndex.js", () => ({
  renderSpacesIndex: vi.fn((model) => `spaces-index:${model.id}`),
}));

vi.mock("../../src/renderers/renderAboutPage.js", () => ({
  renderAboutPage: vi.fn(() => "about-page"),
}));

vi.mock("../../src/renderers/renderAuthorsIndex.js", () => ({
  renderAuthorsIndex: vi.fn((model) => `authors-index:${model.id}`),
}));

vi.mock("../../src/renderers/renderAuthorDetail.js", () => ({
  renderAuthorDetail: vi.fn((model) => `author-detail:${model.slug}:page-${model.currentPage}`),
}));

vi.mock("../../src/renderers/renderSpaceDetail.js", () => ({
  renderSpaceDetail: vi.fn((model) => `space-detail:${model.slug}:page-${model.currentPage}`),
}));

vi.mock("../../src/renderers/tsxPageRuntime.js", () => ({
  renderNewspaperFeedPageTsx: vi.fn((model) => `newspaper:${model.currentDate}:${model.selectedCountry || "all"}`),
}));

vi.mock("../../src/viewModels/authors.js", () => ({
  buildAuthorDetailModel: vi.fn((displayPayload, authorSlug, { currentPage } = {}) => ({
    slug: authorSlug,
    displayPayloadId: displayPayload.id,
    currentPage: currentPage || 1,
    totalPages: authorSlug === "alice" ? 2 : 1,
  })),
}));

vi.mock("../../src/viewModels/spaceDetail.js", () => ({
  buildSpaceDetailModel: vi.fn((displayPayload, spaceSlug, { currentPage } = {}) => ({
    slug: spaceSlug,
    displayPayloadId: displayPayload.id,
    currentPage: currentPage || 1,
    totalPages: spaceSlug === "alpha" ? 2 : 1,
    _enrichedItems: [{ id: `${spaceSlug}-cache` }],
  })),
}));

const pageBuilders = await import("../../src/renderSitePageBuilders.js");

describe("renderSitePageBuilders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports only the active builder surface", () => {
    expect(pageBuilders.buildRootStaticPageEntries).toBeTypeOf("function");
    expect(pageBuilders.buildAuthorPageEntries).toBeTypeOf("function");
    expect(pageBuilders.buildSpacePageEntries).toBeTypeOf("function");
    expect(pageBuilders.buildNewspaperFeedPageEntries).toBeTypeOf("function");
    expect("buildPrimaryFeedSectionPageEntries" in pageBuilders).toBe(false);
    expect("buildSecondaryFeedSectionPageEntries" in pageBuilders).toBe(false);
    expect("buildCountryFeedPageEntries" in pageBuilders).toBe(false);
  });

  it("builds root static pages in the stable index/about order", () => {
    const entries = pageBuilders.buildRootStaticPageEntries({
      spacesIndexModel: { id: "spaces-index" },
    });

    expect(entries).toEqual([
      ["index.html", "spaces-index:spaces-index"],
      ["about/index.html", "about-page"],
    ]);
  });

  it("builds author pages with the index page first and then paginated author detail pages", () => {
    const entries = pageBuilders.buildAuthorPageEntries({
      displayPayload: { id: "display" },
      authorDirectory: { id: "author-directory" },
      authorsIndexModel: {
        id: "authors-index",
        authors: [{ slug: "alice" }, { slug: "bob" }],
      },
    });

    expect(entries).toEqual([
      ["authors/index.html", "authors-index:authors-index"],
      ["authors/alice.html", "author-detail:alice:page-1"],
      ["authors/alice/page/2/index.html", "author-detail:alice:page-2"],
      ["authors/bob.html", "author-detail:bob:page-1"],
    ]);
  });

  it("builds space pages with canonical first-page paths and paginated follow-up paths", () => {
    const entries = pageBuilders.buildSpacePageEntries({
      displayPayload: { id: "display" },
      authorDirectory: { id: "author-directory" },
      spaceSlugs: ["alpha", "beta"],
    });

    expect(entries).toEqual([
      ["spaces/alpha.html", "space-detail:alpha:page-1"],
      ["spaces/alpha/page/2/index.html", "space-detail:alpha:page-2"],
      ["spaces/beta.html", "space-detail:beta:page-1"],
    ]);
  });
});
