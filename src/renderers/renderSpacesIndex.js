import { SPACES_INDEX_SCRIPT_HREF } from "../renderAssets.js";
import {
  escapeHtml,
  formatCompactDate,
  renderField,
  renderLayout,
  renderMetric,
  renderPageHeader,
} from "./layout.js";

export function renderSpacesIndex(model) {
  const lastUpdatedIso = model.generatedAt ? escapeHtml(model.generatedAt) : "";
  const countryOptions = [
    `<option value="all"${model.selectedCountry === "all" ? " selected" : ""}>All countries</option>`,
    ...(model.availableCountries || []).map(
      (country) =>
        `<option value="${escapeHtml(country)}"${model.selectedCountry === country ? " selected" : ""}>${escapeHtml(country)}</option>`,
    ),
  ].join("");

  const cards = model.cards
    .map(
      (card) => `<article class="card"
        data-space-name="${escapeHtml(card.spaceName)}"
        data-country="${escapeHtml(card.country || "")}"
        data-is-failure="${card.isFailure ? "true" : "false"}"
        data-default-visible="${card.isVisibleByDefault ? "true" : "false"}"
        data-latest-item-date="${escapeHtml(card.latestItemDate || "")}"
        data-publication-count="${card.publicationsCount || 0}">
        <h3><a class="space-card-title" href="${card.detailHref}">${card.spaceName}</a></h3>
        <div class="meta">
          ${renderField("Country", card.country)}
        </div>
        <p class="space-card-links">
          ${card.sourceWikiUrl ? `<a href="${card.sourceWikiUrl}">Wiki</a>` : ""}
          ${card.siteUrl ? `<a href="${card.siteUrl}">Website</a>` : ""}
        </p>
        ${typeof card.publicationsCount === "number" ? `<p class="muted space-card-publications">${escapeHtml(`${card.publicationsCount} publication${card.publicationsCount === 1 ? "" : "s"}`)}</p>` : ""}
        ${
          card.latestItemTitle
            ? `<p><span class="field-label">Latest:</span> ${
                card.latestItemLink
                  ? `<a class="space-card-latest-link" href="${card.latestItemLink}">${escapeHtml(card.latestItemTitle)}</a>`
                  : escapeHtml(card.latestItemTitle)
              }</p>`
            : `<p class="muted">No latest publication available.</p>`
        }
        ${card.latestItemDate ? `<p class="space-card-date muted">${escapeHtml(formatCompactDate(card.latestItemDate))}</p>` : ""}
      </article>`,
    )
    .join("");

  return renderLayout({
    title: "Hackerspace News",
    scriptHrefs: [SPACES_INDEX_SCRIPT_HREF],
    body: `
      ${renderPageHeader({
        title: "Hackerspace News",
        titleClass: "home-hero-title",
        headerClass: "page-header--wide page-header--compact",
        introHtml: `<p class="muted"><a class="about-link-muted" href="/about/index.html">About</a>${lastUpdatedIso ? ` <span>• Last updated: <span id="last-updated-label" data-updated-at="${lastUpdatedIso}">${lastUpdatedIso}</span></span>` : ""}</p>`,
        navItems: [
          { href: "/index.html", label: "Hackerspaces", isCurrent: true },
          { href: "/feed/index.html", label: "Feed" },
          { href: "/authors/index.html", label: "Authors" },
        ],
        navClass: "page-nav--wide page-nav--compact",
      })}
      <section class="panel page-summary page-summary--home">
        <div class="summary-grid home-summary-grid">
          ${renderMetric("Total spaces", model.summary.sourceRows)}
          ${renderMetric("Readable feeds", model.summary.parsedFeeds)}
        </div>
        <div class="spaces-controls">
          <label class="spaces-control spaces-control-search">
            <input
              id="space-search-input"
              class="control-input"
              type="search"
              aria-label="Search hackerspaces"
              value="${escapeHtml(model.searchQuery || "")}"
              placeholder="Search by hackerspace name" />
          </label>
          <label class="spaces-control spaces-control-country">
            <select id="country-filter-select" class="control-select control-select-country">
              ${countryOptions}
            </select>
          </label>
          <label class="spaces-control spaces-control-sort">
            <select id="sort-mode-select" class="control-select">
              <option value="alphabetical"${model.sortMode === "alphabetical" ? " selected" : ""}>Alphabetical</option>
              <option value="publication-count"${model.sortMode === "publication-count" ? " selected" : ""}>Publication count</option>
              <option value="latest-publication"${model.sortMode === "latest-publication" ? " selected" : ""}>Latest publication</option>
            </select>
          </label>
          <label class="spaces-control spaces-control-toggle">
            <input id="show-failed-toggle" type="checkbox"${model.showFailed ? " checked" : ""} />
            Show failed feeds
          </label>
        </div>
        <div id="spaces-cards" class="cards">${cards}</div>
        <p id="spaces-empty-state" class="muted" hidden>No hackerspaces match the selected country.</p>
      </section>
    `,
  });
}
