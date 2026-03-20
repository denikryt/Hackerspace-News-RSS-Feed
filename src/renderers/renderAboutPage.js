import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { escapeHtml, renderLayout, renderNav } from "./layout.js";

const ABOUT_HTML_PATH = resolve(process.cwd(), "content/about.html");

export function renderAboutPage({
  sourcePageUrl = "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
} = {}) {
  const sourcePageLabel = formatSourceLabel(sourcePageUrl);
  const aboutHtml = readFileSync(ABOUT_HTML_PATH, "utf8");
  return renderLayout({
    title: "About",
    body: `
      <section class="panel panel-reading page-shell-narrow page-masthead-compact">
        <h1>About</h1>
        <p class="muted">Source page: <a href="${sourcePageUrl}">${escapeHtml(sourcePageLabel)}</a></p>
      </section>
      <div class="page-shell-narrow">
        ${renderNav([
          { href: "/index.html", label: "Hackerspaces" },
          { href: "/feed/index.html", label: "Global Feed" },
        ])}
      </div>
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
