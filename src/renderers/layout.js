export function renderLayout({ title, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        --bg: #f5f1e8;
        --panel: #fffdf8;
        --border: #d2c7b3;
        --text: #2a241b;
        --muted: #6a6257;
        --accent: #9b5d2e;
        --error: #b5523e;
      }
      body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: linear-gradient(180deg, #f3eee3 0%, #f9f6ef 100%); color: var(--text); }
      main { max-width: 1120px; margin: 0 auto; padding: 24px; }
      h1, h2, h3, h4 { margin: 0 0 12px; }
      a { color: var(--accent); }
      nav { display: flex; gap: 16px; margin-bottom: 16px; }
      .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-bottom: 16px; box-shadow: 0 3px 10px rgba(0,0,0,0.04); }
      .summary-grid, .cards { display: grid; gap: 12px; }
      .summary-grid { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
      .cards { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
      .metric, .card { border: 1px solid var(--border); border-radius: 8px; padding: 12px; background: #fff; }
      .metric strong { display: block; font-size: 1.5rem; }
      .muted { color: var(--muted); }
      .meta { display: flex; flex-wrap: wrap; gap: 10px 14px; margin: 8px 0; }
      .field-label { font-weight: 700; }
      .status { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #efe2d0; }
      .status.error { background: #f7dcd6; color: #6f2414; }
      .item-list { display: grid; gap: 12px; }
      .item { border-top: 1px dashed var(--border); padding-top: 12px; }
      .item:first-child { border-top: 0; padding-top: 0; }
      code { background: #f2ebe0; padding: 2px 4px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <main>
      ${body}
    </main>
  </body>
</html>`;
}

export function renderMetric(label, value) {
  return `<div class="metric"><span class="muted">${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

export function renderField(label, value, isLink = false, className = "") {
  if (!value) {
    return "";
  }
  const rendered = isLink
    ? `<a href="${escapeHtml(value)}">${escapeHtml(value)}</a>`
    : escapeHtml(String(value));
  return `<span class="${className}"><span class="field-label">${escapeHtml(label)}:</span> ${rendered}</span>`;
}

export function renderNav(items) {
  return `<nav>${items
    .map((item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`)
    .join("")}</nav>`;
}

export function renderStatus(value) {
  const className = value === "error" ? "status error" : "status";
  return `<span class="${className}">${escapeHtml(value)}</span>`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
