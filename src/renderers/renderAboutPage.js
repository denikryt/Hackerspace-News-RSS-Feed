import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderAboutHeaderLink, renderLayout, renderPageHeader } from "./layout.js";

const ABOUT_HTML_PATH = resolve(process.cwd(), "content/about.html");

export function renderAboutPage() {
  const aboutHtml = readFileSync(ABOUT_HTML_PATH, "utf8");

  return renderLayout({
    title: "About",
    body: `
      ${renderPageHeader({
        title: "About",
        headerClass: "page-header--narrow page-header--compact",
        introHtml: `<p class="muted">${renderAboutHeaderLink()}</p>`,
        navItems: [
          { href: "/index.html", label: "Hackerspaces" },
          { href: "/feed/index.html", label: "Feed" },
          { href: "/authors/index.html", label: "Authors" },
        ],
        navClass: "page-nav--narrow",
      })}
      <section class="page-copy page-copy--narrow about-copy">
        ${aboutHtml}
      </section>
    `,
  });
}
