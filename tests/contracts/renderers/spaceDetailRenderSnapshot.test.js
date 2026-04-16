import { describe, expect, it } from "vitest";

import { buildAuthorDirectory } from "../../../src/viewModels/authors.js";
import { buildSpaceDetailModel } from "../../../src/viewModels/spaceDetail.js";
import { renderSpaceDetail } from "../../../src/renderers/renderSpaceDetail.js";

// Items with HTML content to exercise buildDisplayContent / sanitizeContentHtml paths.
function makeItem(id, date, contentHtml) {
  return {
    id,
    title: `Post ${id}`,
    link: `https://example.com/${id}`,
    resolvedAuthor: "Alice",
    authorSource: "author",
    displayDate: date,
    contentHtml: contentHtml || `<p>Body of post <strong>${id}</strong>.</p>`,
  };
}

// A feed with enough items to force pagination at pageSize=2.
const multiPagePayload = {
  generatedAt: "2026-03-22T20:00:00.000Z",
  sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
  summary: { sourceRows: 1, validFeeds: 1, parsedFeeds: 1, emptyFeeds: 0, failedFeeds: 0 },
  feeds: [
    {
      id: "feed-1",
      sourceWikiUrl: "https://wiki.hackerspaces.org/TestSpace",
      finalFeedUrl: "https://testspace.example.com/feed/",
      siteUrl: "https://testspace.example.com",
      spaceName: "TestSpace",
      country: "Germany",
      feedType: "rss",
      status: "parsed_ok",
      items: [
        makeItem("p1", "2025-03-01T10:00:00.000Z"),
        makeItem("p2", "2025-02-01T10:00:00.000Z"),
        makeItem("p3", "2025-01-01T10:00:00.000Z"),
      ],
    },
  ],
  failures: [],
};

// A feed with a single item — single-page space.
const singlePagePayload = {
  ...multiPagePayload,
  feeds: [
    {
      ...multiPagePayload.feeds[0],
      items: [makeItem("only", "2025-03-01T10:00:00.000Z")],
    },
  ],
};

describe("spaceDetail render snapshot", () => {
  it("single-page space: HTML is stable across repeated renders", () => {
    const authorDirectory = buildAuthorDirectory(singlePagePayload);
    const model = buildSpaceDetailModel(singlePagePayload, "testspace", { authorDirectory });
    const html = renderSpaceDetail(model);

    // Key structural expectations — these double as regression guards.
    expect(html).toContain("<title>TestSpace</title>");
    expect(html).toContain("Post only");
    expect(html).toContain("<strong>only</strong>");
    expect(html).toContain("Germany");

    // Render again — must produce identical output.
    const model2 = buildSpaceDetailModel(singlePagePayload, "testspace", { authorDirectory });
    expect(renderSpaceDetail(model2)).toBe(html);
  });

  it("multi-page space page 1: HTML is stable across repeated renders", () => {
    const authorDirectory = buildAuthorDirectory(multiPagePayload);
    const model = buildSpaceDetailModel(multiPagePayload, "testspace", {
      currentPage: 1,
      pageSize: 2,
      authorDirectory,
    });
    const html = renderSpaceDetail(model);

    expect(html).toContain("<title>TestSpace</title>");
    expect(html).toContain("Post p1");
    expect(html).toContain("Post p2");
    expect(html).not.toContain("Post p3");

    const model2 = buildSpaceDetailModel(multiPagePayload, "testspace", {
      currentPage: 1,
      pageSize: 2,
      authorDirectory,
    });
    expect(renderSpaceDetail(model2)).toBe(html);
  });

  it("multi-page space page 2: HTML is stable across repeated renders", () => {
    const authorDirectory = buildAuthorDirectory(multiPagePayload);
    const model = buildSpaceDetailModel(multiPagePayload, "testspace", {
      currentPage: 2,
      pageSize: 2,
      authorDirectory,
    });
    const html = renderSpaceDetail(model);

    expect(html).toContain("Post p3");
    expect(html).not.toContain("Post p1");

    const model2 = buildSpaceDetailModel(multiPagePayload, "testspace", {
      currentPage: 2,
      pageSize: 2,
      authorDirectory,
    });
    expect(renderSpaceDetail(model2)).toBe(html);
  });
});
