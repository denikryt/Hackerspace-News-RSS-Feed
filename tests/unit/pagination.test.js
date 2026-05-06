import { describe, expect, it } from "vitest";

import {
  buildPageLinks,
  getGlobalFeedHref,
  getSpaceDetailHref,
  normalizePageNumber,
  paginateItems,
} from "../../src/pagination.js";

describe("pagination", () => {
  it("normalizes invalid requested pages into the available range", () => {
    expect(normalizePageNumber("not-a-page", 5)).toBe(1);
    expect(normalizePageNumber(0, 5)).toBe(1);
    expect(normalizePageNumber(9, 4)).toBe(4);
    expect(normalizePageNumber(3, 0)).toBe(1);
  });

  it("paginates items with sanitized page numbers and page sizes", () => {
    expect(
      paginateItems(["a", "b", "c"], -2, 0),
    ).toEqual({
      totalItems: 3,
      pageSize: 10,
      totalPages: 1,
      currentPage: 1,
      items: ["a", "b", "c"],
    });

    expect(
      paginateItems(["a", "b", "c", "d", "e"], 3, 2),
    ).toEqual({
      totalItems: 5,
      pageSize: 2,
      totalPages: 3,
      currentPage: 3,
      items: ["e"],
    });
  });

  it("builds single-page and ellipsis page-link sets", () => {
    expect(buildPageLinks(1, 1, (page) => `/news/page/${page}/`)).toEqual([
      { type: "page", page: 1, href: "/news/page/1/", isCurrent: true },
    ]);

    expect(buildPageLinks(5, 10, (page) => `/news/page/${page}/`)).toEqual([
      { type: "page", page: 1, href: "/news/page/1/", isCurrent: false },
      { type: "ellipsis" },
      { type: "page", page: 4, href: "/news/page/4/", isCurrent: false },
      { type: "page", page: 5, href: "/news/page/5/", isCurrent: true },
      { type: "page", page: 6, href: "/news/page/6/", isCurrent: false },
      { type: "ellipsis" },
      { type: "page", page: 10, href: "/news/page/10/", isCurrent: false },
    ]);
  });

  it("builds canonical first-page hrefs for feed and space detail pages", () => {
    expect(getGlobalFeedHref(1)).toBe("/news/");
    expect(getGlobalFeedHref(3)).toBe("/news/page/3/");
    expect(getSpaceDetailHref("betamachine", 1)).toBe("/spaces/betamachine.html");
    expect(getSpaceDetailHref("betamachine", 4)).toBe("/spaces/betamachine/page/4/");
  });
});
