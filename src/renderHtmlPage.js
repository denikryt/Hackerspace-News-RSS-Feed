export function renderHtmlPage({ sourcePageUrl, generatedAt, summary, feeds, failures }) {
  const feedSections = feeds.map(renderFeedCard).join("\n");
  const failureSections = failures.map(renderFailureCard).join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hackerspace News Feed</title>
    <style>
      :root {
        --bg: #f5f1e8;
        --panel: #fffdf8;
        --border: #d2c7b3;
        --text: #2a241b;
        --muted: #6a6257;
        --accent: #9b5d2e;
      }
      body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: linear-gradient(180deg, #f3eee3 0%, #f9f6ef 100%); color: var(--text); }
      main { max-width: 1100px; margin: 0 auto; padding: 24px; }
      h1, h2, h3 { margin: 0 0 12px; }
      a { color: var(--accent); }
      .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-bottom: 16px; box-shadow: 0 3px 10px rgba(0,0,0,0.04); }
      .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
      .metric { border: 1px solid var(--border); border-radius: 8px; padding: 10px; background: #fff; }
      .metric strong { display: block; font-size: 1.5rem; }
      .muted { color: var(--muted); }
      .feed-meta, .item-meta { display: flex; flex-wrap: wrap; gap: 12px; margin: 8px 0; }
      .field-label { font-weight: 700; }
      .items { display: grid; gap: 12px; margin-top: 12px; }
      .item { border-top: 1px dashed var(--border); padding-top: 12px; }
      .item:first-child { border-top: 0; padding-top: 0; }
      .status { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #efe2d0; }
      .failure { border-left: 4px solid #b5523e; }
      code { background: #f2ebe0; padding: 2px 4px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <main>
      <section class="panel">
        <h1>Hackerspace News Feed</h1>
        <p class="muted">Source page: <a href="${escapeHtml(sourcePageUrl)}">${escapeHtml(sourcePageUrl)}</a></p>
        <p class="muted">Generated at: ${escapeHtml(generatedAt)}</p>
        <div class="summary-grid">
          ${renderMetric("Source rows", summary.sourceRows)}
          ${renderMetric("Valid feeds", summary.validFeeds)}
          ${renderMetric("Parsed feeds", summary.parsedFeeds)}
          ${renderMetric("Empty feeds", summary.emptyFeeds)}
          ${renderMetric("Failed feeds", summary.failedFeeds)}
        </div>
      </section>
      <section class="panel">
        <h2>Feeds</h2>
        ${feedSections || "<p class=\"muted\">No parsed feeds available.</p>"}
      </section>
      <section class="panel">
        <h2>Failures</h2>
        ${failureSections || "<p class=\"muted\">No failed feeds.</p>"}
      </section>
    </main>
  </body>
</html>`;
}

function renderMetric(label, value) {
  return `<div class="metric"><span class="muted">${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function renderFeedCard(feed) {
  const meta = [
    renderField("Country", feed.country),
    renderField("Wiki", feed.sourceWikiUrl, true),
    renderField("Feed URL", feed.finalFeedUrl, true),
    renderField("Feed type", feed.feedType),
    renderField("Status", feed.status, false, "status"),
  ]
    .filter(Boolean)
    .join("");

  const items = (feed.items || []).map(renderItem).join("");

  return `<article class="panel">
    <h3>${escapeHtml(feed.spaceName || feed.feedTitle || "Unknown feed")}</h3>
    <div class="feed-meta">${meta}</div>
    <div class="items">${items || "<p class=\"muted\">No items available.</p>"}</div>
  </article>`;
}

function renderItem(item) {
  const parts = [
    item.publishedAt ? `<div class="item-meta">${renderField("Date", item.publishedAt)}</div>` : "",
    item.summary ? `<p>${escapeHtml(item.summary)}</p>` : "",
    item.link ? `<p><a href="${escapeHtml(item.link)}">Open original</a></p>` : "",
  ]
    .filter(Boolean)
    .join("");

  return `<div class="item">
    <h4>${escapeHtml(item.title || "Untitled item")}</h4>
    ${parts}
  </div>`;
}

function renderFailureCard(failure) {
  return `<article class="panel failure">
    <h3>${escapeHtml(failure.hackerspaceName || "Unknown source")}</h3>
    <p><span class="field-label">Candidate URL:</span> <code>${escapeHtml(failure.candidateUrl || "")}</code></p>
    <p><span class="field-label">Error:</span> ${escapeHtml(failure.errorCode || "unknown_error")}</p>
  </article>`;
}

function renderField(label, value, isLink = false, className = "") {
  if (!value) {
    return "";
  }

  const renderedValue = isLink
    ? `<a href="${escapeHtml(value)}">${escapeHtml(value)}</a>`
    : escapeHtml(String(value));

  return `<span class="${className}"><span class="field-label">${escapeHtml(label)}:</span> ${renderedValue}</span>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
