/** @jsxImportSource @kitajs/html */

import { escapeHtml } from "../renderers/layout.js";
import { renderPageHeaderShell, type NavItems, type RecordLike } from "./pageHelpers.js";

function renderItem(item: RecordLike): string {
  const flagHtml = item.countryFlag && item.countryName
    ? String(<span title={escapeHtml(item.countryName as string)}>{item.countryFlag as string}</span>)
    : (item.countryFlag as string || "");

  const metaParts = [
    flagHtml,
    item.spaceName ? escapeHtml(item.spaceName as string) : null,
    item.resolvedAuthor ? escapeHtml(item.resolvedAuthor as string) : null,
  ].filter(Boolean);
  const metaHtml = metaParts.length
    ? `<p class="np-item-meta">${metaParts.join(" · ")}</p>`
    : "";

  const imageHtml = item.imageUrl
    ? String(<img class="np-item-image" src={item.imageUrl as string} alt="" />)
    : "";

  const bodyHtml = item.summaryText
    ? `<p class="np-item-body">${escapeHtml(item.summaryText as string)}</p>`
    : "";

  return `<article class="np-item">
    <h3 class="np-item-title"><a href="${escapeHtml(item.link as string)}">${escapeHtml(item.title as string)}</a></h3>
    ${metaHtml}
    ${imageHtml}
    ${bodyHtml}
  </article>`;
}

function renderSection(section: RecordLike): string {
  const totalItems: number = (section.totalItems as number) ?? (section.columns as RecordLike[]).reduce((sum: number, col: RecordLike) => sum + (col.items as unknown[]).length, 0);
  const columnsHtml = (section.columns as RecordLike[])
    .map((col: RecordLike, i: number) =>
      `<div class="np-column${i < (section.columns as RecordLike[]).length - 1 ? " np-column--rule" : ""}">${(col.items as RecordLike[]).map(renderItem).join("")}</div>`,
    )
    .join("");

  return `<section class="np-section">
  <h2 class="np-section-header">${escapeHtml(section.label as string)}</h2>
  <div class="np-columns" data-items="${totalItems}">${columnsHtml}</div>
</section>`;
}


function renderDateNav(model: RecordLike): string {
  const base = model.dateHrefBase as string;
  const href = (date: string) => `${escapeHtml(base)}${escapeHtml(date)}/`;

  const prevLink = model.nav.prev
    ? `<a href="${href((model.nav.prev as RecordLike).date as string)}">${escapeHtml((model.nav.prev as RecordLike).label as string)}</a>`
    : "";

  const currentLink = `<a href="${href(model.currentDate as string)}" aria-current="page">${escapeHtml((model.nav.current as RecordLike).label as string)}</a>`;

  const nextLink = model.nav.next
    ? `<a href="${href((model.nav.next as RecordLike).date as string)}">${escapeHtml((model.nav.next as RecordLike).label as string)}</a>`
    : "";

  const countryOptions = (model.countryOptions as RecordLike[])
    .map((opt) =>
      `<option value="${escapeHtml(opt.href as string)}"${opt.isSelected ? " selected" : ""}>${escapeHtml(opt.label as string)}</option>`,
    )
    .join("");

  return `<nav class="section-nav np-date-nav">
  ${prevLink}
  ${currentLink}
  ${nextLink}
</nav>
<section class="feed-controls-shell">
<div class="feed-controls feed-controls-np" data-date-href-base="${escapeHtml(base)}" data-current-date="${escapeHtml(model.currentDate as string)}" data-selected-country="${escapeHtml((model.selectedCountry as string) || "")}">
  <label class="feed-control feed-control-date"><select class="control-select np-date-select" onchange="location.href=this.value"></select></label>
  <label class="feed-control feed-control-country"><select id="feed-country-select" class="control-select" aria-label="Choose feed country" onchange="location.href=this.value">${countryOptions}</select></label>
</div>
</section>`;
}

export function renderNewspaperFeedPageTsx(model: RecordLike): string {
  const navItems = (model.navItems as NavItems | undefined) ?? [
    { href: "/index.html", label: "Hackerspaces", isCurrent: false },
    { href: "/feed/index.html", label: "News", isCurrent: true },
    { href: "/authors/index.html", label: "Authors", isCurrent: false },
  ];

  const countryTitle = model.selectedCountry ? ` — ${model.selectedCountry as string}` : "";
  const title = `Hackerspace News — ${model.dateLabel as string}${countryTitle}`;

  const sectionsHtml = (model.sections as RecordLike[])
    .filter((s) => {
      const total = (s.totalItems as number) ?? (s.columns as RecordLike[]).reduce((sum: number, c: RecordLike) => sum + (c.items as unknown[]).length, 0);
      return total > 0;
    })
    .map(renderSection)
    .join("\n");

  const headerHtml = renderPageHeaderShell({ title: "Hackerspace News", navItems });
  const navHtml = renderDateNav(model);
  const body = `${headerHtml}${navHtml}${sectionsHtml}`;

  const cssHref = escapeHtml(model.cssHref as string);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <link rel="icon" href="/favicon.png" type="image/png" />
    <link rel="stylesheet" href="/site.css" />
    <link rel="stylesheet" href="${cssHref}" />
  </head>
  <body>
    <main>
      ${body}
    </main>
    <script src="/newspaper-nav.js"></script>
  </body>
</html>`;
}
