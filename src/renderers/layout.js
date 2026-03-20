export function renderLayout({ title, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <link rel="icon" href="/favicon.png" type="image/png" />
    <style>
      :root {
        --bg: #f7f7f3;
        --panel: #fbfbf8;
        --border: #d9d9d1;
        --border-strong: #bdbdb1;
        --text: #111111;
        --muted: #666666;
        --accent: #1b4d8a;
        --timeline-marker-offset: 5.3rem;
        --timeline-dot-size: 9px;
        --timeline-entry-gap: 32px;
      }
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); line-height: 1.45; }
      main { max-width: 1180px; margin: 0 auto; padding: 28px 24px 56px; }
      h1, h2, h3, h4 { margin: 0 0 12px; line-height: 0.95; letter-spacing: -0.04em; }
      h1 { font-size: 4.6rem; font-weight: 900; text-transform: uppercase; }
      h2 { font-size: 2.25rem; font-weight: 800; }
      h3 { font-size: 2rem; font-weight: 800; }
      a { color: var(--accent); }
      .section-nav { display: flex; gap: 18px; margin: 0 auto 20px; flex-wrap: wrap; inline-size: min(100%, 74rem); justify-content: flex-start; padding-block: 10px; border-bottom: 1px solid var(--border); }
      .section-nav a { display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 0.96rem; letter-spacing: 0.03em; text-transform: uppercase; color: var(--muted); }
      .section-nav a[aria-current="page"] { color: var(--text); font-weight: 700; }
      .panel { background: transparent; border: 1px solid var(--border); border-radius: 0; padding: 18px 0 14px; margin-bottom: 18px; overflow: hidden; border-left: 0; border-right: 0; border-top: 0; }
      .page-header--compact { padding-bottom: 6px; margin-bottom: 6px; }
      .page-header--compact h1 { margin-bottom: 6px; }
      .page-header--compact .muted { margin: 0; }
      .page-header--narrow { inline-size: min(100%, 46rem); margin-inline: auto; }
      .page-header--narrow.page-header--compact h1 { font-size: 3.35rem; max-inline-size: 100%; }
      .page-header--narrow.page-header--compact p { max-inline-size: 30rem; }
      .page-nav--narrow { inline-size: min(100%, 46rem); margin-inline: auto; }
      .page-nav--narrow > .section-nav { inline-size: 100%; }
      .page-nav--compact .section-nav { margin-bottom: 10px; padding-block: 8px 6px; }
      .page-summary { padding-top: 8px; }
      .page-summary--home .summary-grid { margin-top: 0; margin-bottom: 8px; }
      .page-summary--home .meta { margin-top: 0; }
      .feed-list-shell { inline-size: min(100%, 74rem); margin: 0 auto 16px; }
      .page-copy--narrow { inline-size: min(100%, 46rem); margin-inline: auto; }
      .about-copy { color: var(--text); }
      .about-copy p { margin: 0 0 1rem; line-height: 1.6; }
      .page-shell-narrow { inline-size: min(100%, 46rem); margin-inline: auto; }
      .home-hero-title { font-size: 3.6rem; max-inline-size: 100%; }
      .summary-grid, .cards { display: grid; gap: 12px; }
      .summary-grid { grid-template-columns: repeat(auto-fit, minmax(11rem, max-content)); gap: 10px 22px; margin-top: 14px; }
      .home-summary-grid { grid-template-columns: repeat(2, max-content); }
      .cards { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0; border-top: 1px solid var(--border); border-left: 1px solid var(--border); }
      .metric { display: flex; align-items: baseline; gap: 8px; min-inline-size: 0; font-size: 0.95rem; }
      .metric strong { font-size: 1rem; line-height: 1; margin: 0; }
      .card { border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); border-radius: 0; padding: 16px; background: transparent; min-height: 100%; display: flex; flex-direction: column; }
      .space-card-title { color: var(--text); }
      .space-card-links { display: flex; flex-wrap: wrap; gap: 0.9rem; margin: 0.55rem 0 1rem; font-size: 0.95rem; }
      .space-card-links a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 0.16rem; }
      .space-card-latest-link { color: var(--text); }
      .space-card-date { font-size: 0.82rem; letter-spacing: 0.05em; text-transform: uppercase; margin-top: auto; padding-top: 1rem; }
      .muted { color: var(--muted); }
      .about-link-muted { color: var(--muted); text-decoration: none; background: none; border: 0; }
      .meta { display: flex; flex-wrap: wrap; gap: 8px 16px; margin: 8px 0; overflow-wrap: anywhere; font-size: 0.92rem; color: var(--muted); }
      label { display: inline-flex; align-items: center; gap: 0.45rem; }
      select {
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        min-height: 1.9rem;
        padding: 0.16rem 1.55rem 0.16rem 0.5rem;
        border: 1px solid var(--border-strong);
        border-radius: 0;
        background-color: var(--panel);
        background-image:
          linear-gradient(45deg, transparent 50%, var(--text) 50%),
          linear-gradient(135deg, var(--text) 50%, transparent 50%);
        background-position:
          calc(100% - 0.72rem) calc(50% - 1px),
          calc(100% - 0.5rem) calc(50% - 1px);
        background-size: 0.24rem 0.24rem, 0.24rem 0.24rem;
        background-repeat: no-repeat;
        color: var(--text);
        font: inherit;
        font-size: 0.9rem;
        line-height: 1.15;
        box-shadow: none;
      }
      .control-select-country { inline-size: 11rem; }
      select:focus {
        outline: none;
        border-color: var(--text);
      }
      input[type="checkbox"] {
        appearance: none;
        -webkit-appearance: none;
        inline-size: 0.9rem;
        block-size: 0.9rem;
        margin: 0;
        border: 1px solid var(--border-strong);
        border-radius: 0;
        background: var(--panel);
        position: relative;
      }
      input[type="checkbox"]:checked::after {
        content: "";
        position: absolute;
        inset: 0.12rem;
        background: var(--text);
      }
      .field-label { font-weight: 700; }
      .item-list { display: grid; gap: 0; min-inline-size: 0; }
      .timeline-entry { display: grid; grid-template-columns: 7rem 1rem minmax(0, 1fr); column-gap: 16px; padding: 0 0 var(--timeline-entry-gap); }
      .timeline-shell-narrow .timeline-entry { grid-template-columns: 4.7rem 1rem minmax(0, 1fr); column-gap: 12px; }
      .timeline-date { padding-inline-end: 8px; align-self: start; text-align: right; display: flex; flex-direction: column; align-items: flex-end; min-block-size: 5.3rem; justify-content: center; }
      .timeline-axis { position: relative; align-self: stretch; }
      .timeline-axis::before {
        content: "";
        position: absolute;
        inset-block: 0 calc(-1 * var(--timeline-entry-gap));
        inset-inline-start: 50%;
        transform: translateX(-50%);
        inline-size: 1px;
        background: var(--border);
      }
      .item-list > .timeline-entry:last-child .timeline-axis::before {
        inset-block-end: 0;
      }
      .timeline-axis::after {
        content: "";
        position: absolute;
        inset-inline-start: 50%;
        inset-block-start: calc(var(--timeline-marker-offset) / 2);
        transform: translate(-50%, -50%);
        inline-size: var(--timeline-dot-size);
        block-size: var(--timeline-dot-size);
        border-radius: 999px;
        background: var(--text);
        box-shadow: 0 0 0 6px var(--bg);
      }
      .timeline-date-label, .timeline-date-year { display: block; text-transform: uppercase; font-size: 0.76rem; letter-spacing: 0.08em; color: var(--muted); width: 100%; text-align: right; }
      .timeline-date-day { display: block; font-size: 1.75rem; font-weight: 800; line-height: 0.95; margin: 0.14rem 0 0.1rem; color: var(--text); width: 100%; text-align: right; }
      .timeline-content { min-inline-size: 0; padding-bottom: 28px; border-bottom: 1px solid var(--border); }
      .item-header { margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--border-strong); min-block-size: 4.8rem; display: flex; align-items: flex-start; }
      .item-header .meta { margin: 0; display: grid; gap: 8px; width: 100%; }
      .item-header .meta > * { min-inline-size: 0; }
      .item-header .meta a {
        display: inline-block;
        max-inline-size: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        vertical-align: bottom;
      }
      .global-feed-meta-link {
        color: var(--muted);
        display: inline-block !important;
        white-space: nowrap;
        font-weight: 600;
        line-height: 1.05;
        padding-bottom: 0.14em;
        text-decoration: none;
        background-image: linear-gradient(currentColor, currentColor);
        background-repeat: no-repeat;
        background-size: 100% 1px;
        background-position: 0 100%;
      }
      .global-feed-space-link { font-size: 1.1rem; }
      .global-feed-original-link { font-size: 0.98rem; font-weight: 500; }
      .detail-header-meta { align-items: baseline; }
      .detail-header-link { line-height: 1.2; padding-bottom: 0.14em; }
      .item-header-detail { min-block-size: 2.4rem; margin-bottom: 10px; padding-bottom: 10px; }
      .item-header-global { min-block-size: auto; }
      .global-feed-meta { display: flex !important; flex-wrap: nowrap; gap: 0.9rem; align-items: flex-end; }
      .global-feed-meta > span { display: inline-flex; align-items: flex-end; }
      .detail-item-meta { align-items: baseline; }
      .detail-item-meta-link { padding-bottom: 0.14em; }
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
        h1 { font-size: 3.1rem; }
        h2 { font-size: 1.9rem; }
        h3 { font-size: 1.45rem; }
        .panel { padding: 14px 0 12px; }
        .section-nav { gap: 12px; }
        .summary-grid { grid-template-columns: 1fr; }
        .home-summary-grid { grid-template-columns: repeat(2, max-content); gap: 10px 18px; }
        select { min-height: 1.85rem; }
        .control-select-country { inline-size: 10rem; max-inline-size: 100%; }
        .page-shell-narrow,
        .page-header--narrow,
        .page-nav--narrow,
        .page-copy--narrow { inline-size: 100%; }
        .page-header--narrow.page-header--compact h1 { font-size: clamp(2rem, 11vw, 3.1rem); }
        .home-hero-title { font-size: clamp(2rem, 11vw, 2.55rem); }
        .timeline-entry,
        .timeline-shell-narrow .timeline-entry { grid-template-columns: 1fr; row-gap: 10px; column-gap: 0; padding-bottom: 24px; }
        .timeline-date,
        .timeline-shell-narrow .timeline-date { padding-inline-end: 0; margin-bottom: 6px; align-items: flex-start; text-align: left; }
        .timeline-date-label, .timeline-date-year, .timeline-date-day { text-align: left; }
        .timeline-axis { display: none; }
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

export function renderPageHeader({
  title,
  titleClass = "",
  introHtml = "",
  headerClass = "",
  navItems = [],
  navClass = "",
}) {
  const sectionClass = ["panel", "page-header", headerClass].filter(Boolean).join(" ");
  const titleClassAttribute = titleClass ? ` class="${titleClass}"` : "";
  const navHtml = navItems.length > 0 ? renderNav(navItems) : "";
  const wrappedNavHtml = navHtml
    ? navClass
      ? `<div class="page-nav ${navClass}">${navHtml}</div>`
      : navHtml
    : "";

  return `
      <section class="${sectionClass}">
        <h1${titleClassAttribute}>${escapeHtml(title)}</h1>
        ${introHtml}
      </section>
      ${wrappedNavHtml}
    `;
}

export function renderMetric(label, value) {
  return `<div class="metric"><span class="muted">${escapeHtml(label)}:</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

export function renderField(label, value) {
  if (!value) {
    return "";
  }
  return `<span><span class="field-label">${escapeHtml(label)}:</span> ${escapeHtml(String(value))}</span>`;
}

export function renderNav(items) {
  return `<nav class="section-nav">${items
    .map(
      (item) =>
        `<a href="${escapeHtml(item.href)}"${item.isCurrent ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`,
    )
    .join("")}</nav>`;
}

export function renderTimelineDate(value) {
  const formatted = formatDisplayDateParts(value);
  if (!formatted) {
    return `<div class="timeline-date">
      <span class="timeline-date-label">NO DATE</span>
    </div>`;
  }

  return `<div class="timeline-date">
    <span class="timeline-date-label">${escapeHtml(formatted.month)}</span>
    <span class="timeline-date-day">${escapeHtml(formatted.day)}</span>
    <span class="timeline-date-year">${escapeHtml(formatted.year)}</span>
  </div>`;
}

export function formatCompactDate(value) {
  const formatted = formatDisplayDateParts(value);
  if (!formatted) {
    return "";
  }

  return `${formatted.month} ${formatted.day}, ${formatted.year}`;
}

function formatDisplayDateParts(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return null;
  }

  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" })
    .format(parsed)
    .toUpperCase();
  const day = new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone: "UTC" }).format(parsed);
  const year = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "UTC" }).format(parsed);

  return { month, day, year };
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
