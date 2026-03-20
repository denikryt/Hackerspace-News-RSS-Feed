export function renderLayout({ title, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        --bg: #f7f7f3;
        --panel: #fbfbf8;
        --border: #d9d9d1;
        --border-strong: #bdbdb1;
        --text: #111111;
        --muted: #666666;
        --accent: #1b4d8a;
        --error: #8c3324;
      }
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); line-height: 1.45; }
      main { max-width: 1180px; margin: 0 auto; padding: 28px 24px 56px; }
      h1, h2, h3, h4 { margin: 0 0 12px; line-height: 0.95; letter-spacing: -0.04em; }
      h1 { font-size: clamp(3.4rem, 9vw, 6.8rem); font-weight: 900; text-transform: uppercase; }
      h2 { font-size: clamp(1.7rem, 4vw, 2.5rem); font-weight: 800; }
      h3 { font-size: clamp(1.45rem, 2.3vw, 2.2rem); font-weight: 800; }
      a { color: var(--accent); }
      .section-nav { display: flex; gap: 18px; margin: 0 auto 20px; flex-wrap: wrap; inline-size: min(100%, 74rem); justify-content: flex-start; padding-block: 10px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
      .section-nav a { display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 0.96rem; letter-spacing: 0.03em; text-transform: uppercase; color: var(--muted); }
      .section-nav a[aria-current="page"] { color: var(--text); font-weight: 700; }
      .panel { background: transparent; border: 1px solid var(--border); border-radius: 0; padding: 18px 0 14px; margin-bottom: 18px; overflow: hidden; border-left: 0; border-right: 0; }
      .panel-reading { inline-size: min(100%, 74rem); margin-inline: auto; }
      .feed-list-shell { inline-size: min(100%, 74rem); margin: 0 auto 16px; }
      .page-shell-narrow { inline-size: min(100%, 46rem); margin-inline: auto; }
      .page-shell-narrow > .section-nav { inline-size: 100%; }
      .page-masthead-compact h1 { font-size: clamp(2.3rem, 5.6vw, 3.6rem); }
      .page-masthead-compact p { max-inline-size: 30rem; }
      .summary-grid, .cards { display: grid; gap: 12px; }
      .summary-grid { grid-template-columns: repeat(auto-fit, minmax(11rem, max-content)); gap: 10px 22px; margin-top: 14px; }
      .cards { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0; border-top: 1px solid var(--border); border-left: 1px solid var(--border); }
      .metric { display: flex; align-items: baseline; gap: 8px; min-inline-size: 0; font-size: 0.95rem; }
      .metric strong { font-size: 1rem; line-height: 1; margin: 0; }
      .card { border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); border-radius: 0; padding: 16px; background: transparent; min-height: 100%; }
      .muted { color: var(--muted); }
      .meta { display: flex; flex-wrap: wrap; gap: 8px 16px; margin: 8px 0; overflow-wrap: anywhere; font-size: 0.92rem; color: var(--muted); }
      .field-label { font-weight: 700; }
      .status { display: inline-block; padding: 0.18rem 0.55rem; border-radius: 999px; border: 1px solid var(--border); background: transparent; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.03em; }
      .status.error { border-color: rgba(140, 51, 36, 0.25); color: var(--error); }
      .item-list { display: grid; gap: 0; min-inline-size: 0; }
      .timeline-entry { display: grid; grid-template-columns: 7rem minmax(0, 1fr); gap: 24px; padding: 0 0 32px; position: relative; }
      .timeline-entry::before { content: ""; position: absolute; inset-block: 0 0; inset-inline-start: calc(7rem - 1px); inline-size: 1px; background: var(--border); }
      .timeline-shell-narrow .timeline-entry { grid-template-columns: 4.7rem minmax(0, 1fr); gap: 16px; }
      .timeline-shell-narrow .timeline-entry::before { inset-inline-start: calc(4.7rem - 1px); }
      .timeline-date { position: relative; padding-inline-end: 16px; background: var(--bg); z-index: 1; align-self: start; }
      .timeline-date::after { content: ""; position: absolute; inset-inline-end: -5px; inset-block-start: 0.95rem; inline-size: 9px; block-size: 9px; border-radius: 999px; background: var(--text); }
      .timeline-date-label, .timeline-date-year { display: block; text-transform: uppercase; font-size: 0.76rem; letter-spacing: 0.08em; color: var(--muted); }
      .timeline-date-day { display: block; font-size: 1.75rem; font-weight: 800; line-height: 0.95; margin: 0.14rem 0 0.1rem; color: var(--text); }
      .timeline-content { min-inline-size: 0; padding-bottom: 28px; border-bottom: 1px solid var(--border); }
      .item-header { margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--border-strong); }
      .item-header .meta { margin: 0; }
      .item-title { margin: 0 0 14px; text-transform: uppercase; }
      .content-body { margin: 10px 0; line-height: 1.55; max-inline-size: 100%; overflow-wrap: anywhere; }
      .content-body.plain-text { white-space: pre-wrap; }
      .content-body.rich-html { overflow-wrap: anywhere; }
      .content-body.rich-html :where(p, ul, ol, li, blockquote, pre, figure) { max-inline-size: 100%; }
      .content-body.rich-html p:first-child { margin-top: 0; }
      .content-body.rich-html p:last-child { margin-bottom: 0; }
      .content-body.rich-html img { display: block; inline-size: auto; width: auto; height: auto; max-inline-size: min(100%, 42rem); max-block-size: 32rem; margin: 12px auto; border-radius: 6px; object-fit: contain; }
      .content-body.rich-html img[src*="emoji"], .content-body.rich-html img[src*="/emoji/"], .content-body.rich-html img[src*="s.w.org/images/core/emoji"] { display: inline-block; inline-size: 1.25em; width: 1.25em; height: 1.25em; max-inline-size: none; max-block-size: none; margin: 0 0.12em; vertical-align: text-bottom; border-radius: 0; }
      .content-body.rich-html pre { overflow-x: auto; white-space: pre-wrap; }
      .attachments { max-inline-size: 100%; overflow-wrap: anywhere; font-size: 0.94rem; }
      .attachments ul { margin: 6px 0 0; padding-left: 18px; }
      .pagination { display: flex; align-items: center; justify-content: flex-start; gap: 12px; flex-wrap: wrap; margin-top: 24px; padding-top: 12px; border-top: 1px solid var(--border); }
      .pagination-pages { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: center; }
      .pagination-link, .pagination-ellipsis { display: inline-flex; align-items: center; justify-content: center; min-width: 2rem; padding: 0.28rem 0.45rem; border: 0; background: transparent; text-decoration: none; color: var(--muted); }
      .pagination-link.current { color: var(--text); font-weight: 700; text-decoration: underline; text-underline-offset: 0.22rem; }
      .pagination-link.disabled { color: var(--muted); opacity: 0.5; }
      code { background: #f0f0eb; padding: 2px 4px; border-radius: 4px; }
      @media (max-width: 720px) {
        main { padding: 16px; }
        h1 { font-size: clamp(2.5rem, 15vw, 4.2rem); }
        .panel { padding: 14px 0 12px; }
        .section-nav { gap: 12px; }
        .summary-grid { grid-template-columns: 1fr; }
        .page-shell-narrow { inline-size: 100%; }
        .page-masthead-compact h1 { font-size: clamp(2rem, 12vw, 3.1rem); }
        .timeline-entry,
        .timeline-shell-narrow .timeline-entry { grid-template-columns: 1fr; gap: 10px; padding-bottom: 24px; }
        .timeline-entry::before,
        .timeline-shell-narrow .timeline-entry::before { display: none; }
        .timeline-date,
        .timeline-shell-narrow .timeline-date { padding-inline-end: 0; margin-bottom: 6px; }
        .timeline-date::after,
        .timeline-shell-narrow .timeline-date::after { display: none; }
        .timeline-content { padding-bottom: 22px; }
      }
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
  return `<div class="metric"><span class="muted">${escapeHtml(label)}:</span><strong>${escapeHtml(String(value))}</strong></div>`;
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
  return `<nav class="section-nav">${items
    .map(
      (item) =>
        `<a href="${escapeHtml(item.href)}"${item.isCurrent ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`,
    )
    .join("")}</nav>`;
}

export function renderStatus(value) {
  const className = value === "error" ? "status error" : "status";
  return `<span class="${className}">${escapeHtml(value)}</span>`;
}

export function renderTimelineDate(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return `<div class="timeline-date">
      <span class="timeline-date-label">NO DATE</span>
    </div>`;
  }

  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" })
    .format(parsed)
    .toUpperCase();
  const day = new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone: "UTC" }).format(parsed);
  const year = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "UTC" }).format(parsed);

  return `<div class="timeline-date">
    <span class="timeline-date-label">${escapeHtml(month)}</span>
    <span class="timeline-date-day">${escapeHtml(day)}</span>
    <span class="timeline-date-year">${escapeHtml(year)}</span>
  </div>`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
