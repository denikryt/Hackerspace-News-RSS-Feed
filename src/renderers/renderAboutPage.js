import { escapeHtml, renderLayout, renderNav } from "./layout.js";

export function renderAboutPage({
  sourcePageUrl = "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
} = {}) {
  const sourcePageLabel = formatSourceLabel(sourcePageUrl);
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
        <p>This site aggregates publications from hackerspace feeds collected from the wiki source page and presents them in a simple editorial archive.</p>
        <p>Feed URLs are extracted from the curated hackerspaces list, validated, parsed, and normalized before the site is rendered.</p>
        <p>The result is a lightweight browsing interface for exploring recent posts, individual hackerspace archives, and the global feed in one place.</p>
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
