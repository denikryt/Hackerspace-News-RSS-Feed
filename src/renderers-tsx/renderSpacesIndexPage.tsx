/** @jsxImportSource @kitajs/html */

import { SPACES_INDEX_SCRIPT_HREF } from "../renderAssets.js";
import { escapeHtml, renderLayout, renderMetric } from "../renderers/layout.js";
import { renderPageHeaderShell, renderSpaceCard, type NavItems, type RecordLike } from "./pageHelpers.js";

const renderLayoutShell = renderLayout as (props: { title: string; body: string; scriptHrefs?: string[] }) => string;

export function renderSpacesIndexPageTsx(model: RecordLike) {
  const lastUpdatedIso = model.generatedAt ? escapeHtml(model.generatedAt) : "";
  const navItems: NavItems = [
    { href: "/index.html", label: "Hackerspaces", isCurrent: true },
    { href: "/feed/index.html", label: "Feed" },
    { href: "/authors/index.html", label: "Authors" },
  ];
  const body = [
    renderPageHeaderShell({
      title: "Hackerspace News",
      titleClass: "home-hero-title",
      headerClass: "page-header--wide page-header--compact",
      introHtml: `<p class="muted"><a class="about-link-muted" href="/about/index.html">About</a>${lastUpdatedIso ? ` <span>• Last updated: <span id="last-updated-label" data-updated-at="${lastUpdatedIso}">${lastUpdatedIso}</span></span>` : ""}</p>`,
      navItems,
      navClass: "page-nav--wide page-nav--compact",
    }),
    String(
      <section class="panel page-summary page-summary--home">
        <div class="summary-grid home-summary-grid">
          {renderMetric("Total spaces", model.summary.sourceRows)}
          {renderMetric("Readable feeds", model.summary.parsedFeeds)}
        </div>
        <div class="spaces-controls">
          <label class="spaces-control spaces-control-search"><input id="space-search-input" class="control-input" type="search" aria-label="Search hackerspaces" value={model.searchQuery || ""} placeholder="Search by hackerspace name" /></label>
          <label class="spaces-control spaces-control-country"><select id="country-filter-select" class="control-select control-select-country"><option value="all" selected={model.selectedCountry === "all"}>All countries</option>{(model.availableCountries || []).map((country: string) => <option value={country} selected={model.selectedCountry === country}>{escapeHtml(country)}</option>)}</select></label>
          <label class="spaces-control spaces-control-sort"><select id="sort-mode-select" class="control-select"><option value="alphabetical" selected={model.sortMode === "alphabetical"}>Alphabetical</option><option value="publication-count" selected={model.sortMode === "publication-count"}>Publication count</option><option value="latest-publication" selected={model.sortMode === "latest-publication"}>Latest publication</option></select></label>
          <label class="spaces-control spaces-control-toggle"><input id="show-failed-toggle" type="checkbox" checked={Boolean(model.showFailed)} />Show failed feeds</label>
        </div>
        <div id="spaces-cards" class="cards">{(model.cards || []).map((card: RecordLike) => renderSpaceCard(card))}</div>
        <p id="spaces-empty-state" class="muted" hidden>No hackerspaces match the selected country.</p>
      </section>,
    ),
  ].join("");
  return renderLayoutShell({ title: "Hackerspace News", scriptHrefs: [SPACES_INDEX_SCRIPT_HREF], body });
}
