import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/feedSections.js", () => ({
  FEED_CONTENT_STREAM_ID: "feed",
  getFeedSectionOutputPath: vi.fn((sectionId, currentPage) =>
    currentPage === 1
      ? `${sectionId}/index.html`
      : `${sectionId}/page/${currentPage}/index.html`,
  ),
}));

vi.mock("../../src/countryFeeds.js", () => ({
  getCountryFeedOutputPath: vi.fn((sectionId, country, currentPage) =>
    currentPage === 1
      ? `${sectionId}/countries/${country}/index.html`
      : `${sectionId}/countries/${country}/page/${currentPage}/index.html`,
  ),
}));

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

vi.mock("../../src/renderers/renderGlobalFeed.js", () => ({
  renderGlobalFeed: vi.fn((model) => `global-feed:${model.kind}:${model.pathKey}`),
}));

vi.mock("../../src/renderers/renderAuthorDetail.js", () => ({
  renderAuthorDetail: vi.fn((model) => `author-detail:${model.slug}:page-${model.currentPage}`),
}));

vi.mock("../../src/renderers/renderSpaceDetail.js", () => ({
  renderSpaceDetail: vi.fn((model) => `space-detail:${model.slug}:page-${model.currentPage}`),
}));

vi.mock("../../src/viewModels/feedSections.js", () => ({
  buildFeedSectionModel: vi.fn((displayPayload, { sectionId, currentPage }) => ({
    kind: "section",
    pathKey: `${sectionId}-${currentPage}`,
    displayPayloadId: displayPayload.id,
    sectionId,
    currentPage,
  })),
}));

vi.mock("../../src/viewModels/countryFeeds.js", () => ({
  buildCountryFeedModel: vi.fn((displayPayload, sectionId, slug, { currentPage }) => ({
    kind: "country",
    pathKey: `${sectionId}-${slug}-${currentPage}`,
    displayPayloadId: displayPayload.id,
    sectionId,
    slug,
    currentPage,
  })),
  listCountryFeedOptions: vi.fn((displayPayload, sectionId) => [
    { label: `${displayPayload.id}:${sectionId}`, href: `/${sectionId}/index.html`, isSelected: false },
  ]),
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
  })),
}));

const pageBuilders = await import("../../src/renderSitePageBuilders.js");

describe("renderSitePageBuilders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("builds primary feed section entries with stable page paths", () => {
    const logger = vi.fn();
    const entries = pageBuilders.buildPrimaryFeedSectionPageEntries({
      displayPayload: { id: "display" },
      feedSections: [{ id: "feed", totalItems: 11 }],
      feedSectionContext: { id: "feed-sections" },
      countryFeedContext: { id: "country-feeds" },
    }, { logger });

    expect(entries).toEqual([
      ["feed/index.html", "global-feed:section:feed-1"],
      ["feed/page/2/index.html", "global-feed:section:feed-2"],
    ]);
    expect(logger).toHaveBeenCalledWith("[render] rendering primary feed section: pages=2");
    expect(logger).toHaveBeenCalledWith("[render] rendered primary feed section");
  });

  it("builds country feed entries grouped by section and country in a deterministic order", () => {
    const entries = pageBuilders.buildCountryFeedPageEntries({
      displayPayload: { id: "display" },
      feedSections: [{ id: "feed" }, { id: "events" }],
      countryFeedContext: {
        itemsBySectionIdByCountry: new Map([
          ["feed", new Map([["france", Array.from({ length: 11 }, (_, index) => index)]])],
          ["events", new Map([["germany", ["only-one"]]])],
        ]),
      },
      listCountryFeedsForSection(sectionId) {
        if (sectionId === "feed") {
          return [{ sectionId, country: "france", slug: "france" }];
        }

        return [{ sectionId, country: "germany", slug: "germany" }];
      },
    });

    expect(entries).toEqual([
      ["feed/countries/france/index.html", "global-feed:country:feed-france-1"],
      ["feed/countries/france/page/2/index.html", "global-feed:country:feed-france-2"],
      ["events/countries/germany/index.html", "global-feed:country:events-germany-1"],
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
