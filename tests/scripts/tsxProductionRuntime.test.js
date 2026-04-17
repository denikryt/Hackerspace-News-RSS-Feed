import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

describe("tsx-backed production helpers", () => {
  it("keep working when imported from plain node js entry points", () => {
    const stdout = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
          import { renderPageHeader } from "./src/renderers/layout.js";
          import { renderPagination } from "./src/renderers/feedPageShared.js";
          import { renderAuthorLinks } from "./src/renderers/renderAuthorLinks.js";

          console.log(JSON.stringify({
            header: renderPageHeader({
              title: "Runtime",
              navItems: [{ href: "/news/index.html", label: "News", isCurrent: true }],
            }),
            pagination: renderPagination({
              currentPage: 2,
              totalPages: 3,
              hasPreviousPage: true,
              hasNextPage: true,
              previousPageHref: "/news/index.html",
              nextPageHref: "/news/page/3/",
              pageLinks: [
                { type: "page", page: 1, href: "/news/index.html", isCurrent: false },
                { type: "page", page: 2, href: "/news/page/2/", isCurrent: true },
                { type: "page", page: 3, href: "/news/page/3/", isCurrent: false }
              ],
            }, "Feed pagination"),
            authors: renderAuthorLinks([{ label: "Alice", href: "/authors/alice.html" }]),
          }));
        `,
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: "pipe",
      },
    );

    const payload = JSON.parse(stdout.trim());

    expect(payload.header).toContain("<h1>Runtime</h1>");
    expect(payload.header).toContain('aria-current="page"');
    expect(payload.pagination).toContain('aria-label="Feed pagination"');
    expect(payload.pagination).toContain('class="pagination-link current"');
    expect(payload.authors).toContain("Author:&nbsp;");
    expect(payload.authors).toContain('href="/authors/alice.html"');
  });
});
