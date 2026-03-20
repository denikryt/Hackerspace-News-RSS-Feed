import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { escapeHtml, renderLayout, renderPageHeader } from "./layout.js";

const ABOUT_HTML_PATH = resolve(process.cwd(), "content/about.html");

export function renderAboutPage({
  sourcePageUrl = "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
  sourceCodeUrl = "https://github.com/example/hackerspace-news-feed",
} = {}) {
  const sourcePageLabel = formatSourceLabel(sourcePageUrl);
  const aboutHtml = readFileSync(ABOUT_HTML_PATH, "utf8")
    .replaceAll("__DATA_SOURCE_URL__", escapeHtml(sourcePageUrl))
    .replaceAll("__DATA_SOURCE_LABEL__", escapeHtml(sourcePageLabel))
    .replaceAll("__SOURCE_CODE_URL__", escapeHtml(sourceCodeUrl))
    .replaceAll("__SOURCE_CODE_LABEL__", escapeHtml(sourceCodeUrl));
  return renderLayout({
    title: "About",
    body: `
      ${renderPageHeader({
        title: "About",
        shellClass: "page-shell-narrow page-masthead-compact",
        navItems: [
          { href: "/index.html", label: "Hackerspaces" },
          { href: "/feed/index.html", label: "Global Feed" },
        ],
        navWrapperClass: "page-shell-narrow",
      })}
      <section class="page-shell-narrow about-copy">
        ${aboutHtml}
      </section>
    `,
  });
}

function formatSourceLabel(value) {
  try {
    const url = new URL(value);
    return url.hostname;
  } catch {
    return value;
  }
}
