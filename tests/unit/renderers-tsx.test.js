import { describe, expect, it } from "vitest";

import { renderAuthorLinks } from "../../src/renderers/renderAuthorLinks.js";
import { renderPageHeader } from "../../src/renderers/layout.js";
import { renderPagination } from "../../src/renderers/feedPageShared.js";
import {
  renderAuthorLinksTsx,
  renderPageHeaderTsx,
  renderPaginationTsx,
} from "../../src/renderers-tsx/shared.tsx";

describe("renderers-tsx shared primitive parity", () => {
  it("renders author links with the same output contract as the current string helper", () => {
    const authorLinks = [
      { label: "Alice", href: "/authors/alice.html" },
      { label: "Bob", href: "/authors/bob.html" },
    ];

    expect(renderAuthorLinksTsx(authorLinks, {
      linkClass: "global-feed-meta-link",
      labelClass: "field-label",
    })).toBe(
      renderAuthorLinks(authorLinks, {
        linkClass: "global-feed-meta-link",
        labelClass: "field-label",
      }),
    );
  });

  it("renders page headers with the same shared shell as the current helper", () => {
    const props = {
      title: "About",
      headerClass: "page-header--narrow page-header--compact",
      introHtml: '<p class="muted">Intro copy</p>',
      navClass: "page-nav--narrow",
      navItems: [
        { href: "/index.html", label: "Hackerspaces" },
        { href: "/news/index.html", label: "News", isCurrent: true },
      ],
    };

    expect(renderPageHeaderTsx(props)).toBe(renderPageHeader(props));
  });

  it("renders pagination with the same output contract as the current shared helper", () => {
    const model = {
      currentPage: 2,
      totalPages: 3,
      hasPreviousPage: true,
      hasNextPage: true,
      previousPageHref: "/news/index.html",
      nextPageHref: "/news/page/3/index.html",
      pageLinks: [
        { type: "page", page: 1, href: "/news/index.html", isCurrent: false },
        { type: "page", page: 2, href: "/news/page/2/index.html", isCurrent: true },
        { type: "page", page: 3, href: "/news/page/3/index.html", isCurrent: false },
      ],
    };

    expect(renderPaginationTsx(model, "Feed pagination")).toBe(
      renderPagination(model, "Feed pagination"),
    );
  });
});
