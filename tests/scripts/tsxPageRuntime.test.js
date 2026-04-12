import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

describe("tsx-backed page runtime", () => {
  it("keeps the centralized page bridge importable from plain node js entry points", () => {
    const stdout = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
          import {
            renderAboutPageTsx,
            renderGlobalFeedPageTsx,
          } from "./src/renderers/tsxPageRuntime.js";

          console.log(JSON.stringify({
            about: renderAboutPageTsx(),
            feed: renderGlobalFeedPageTsx({
              items: [],
              homeHref: "/index.html",
              currentPageLabel: "Page 1 of 1",
              streamNavItems: [{ href: "/feed/index.html", label: "Feed", isCurrent: true }],
            }),
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

    expect(payload.about).toContain("<title>About</title>");
    expect(payload.about).toContain("<strong>Data Sources:</strong>");
    expect(payload.feed).toContain("<title>Feed</title>");
    expect(payload.feed).toContain('href="/feed/index.html"');
    expect(payload.feed).toContain("No feed items available.");
  });
});
