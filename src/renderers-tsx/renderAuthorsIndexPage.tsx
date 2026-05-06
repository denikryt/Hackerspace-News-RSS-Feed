/** @jsxImportSource @kitajs/html */

import { AUTHORS_INDEX_SCRIPT_HREF } from "../renderAssets.js";
import { renderAboutHeaderLink, renderLayout } from "../renderers/layout.js";
import { getAuthorsIndexHref, getHomeHref, getNewsIndexHref } from "../sitePaths.js";
import { renderAuthorCard, renderPageHeaderShell, type NavItems, type RecordLike } from "./pageHelpers.js";

const renderLayoutShell = renderLayout as (props: { title: string; body: string; scriptHrefs?: string[] }) => string;

export function renderAuthorsIndexPageTsx(model: RecordLike) {
  const homeHref = model.homeHref || getHomeHref();
  const feedHref = model.feedHref || getNewsIndexHref();
  const authorsIndexHref = model.authorsIndexHref || getAuthorsIndexHref();
  const navItems: NavItems = [
    { href: homeHref, label: "Hackerspaces" },
    { href: feedHref, label: "News" },
    { href: authorsIndexHref, label: "Authors", isCurrent: true },
  ];
  const body = [
    renderPageHeaderShell({
      title: "Authors",
      titleClass: "home-hero-title",
      headerClass: "page-header--wide page-header--compact",
      introHtml: `<p class="muted">${renderAboutHeaderLink()} <span>• All public authors detected from the dataset.</span></p>`,
      navItems,
      navClass: "page-nav--wide page-nav--compact",
    }),
    String(
      <section class="panel page-summary page-summary--home">
        <div class="authors-controls">
          <label class="authors-control authors-control-search"><input id="author-search-input" class="control-input" type="search" aria-label="Search authors" value={model.authorQuery || ""} placeholder="Search by author name" /></label>
          <label class="authors-control authors-control-hackerspace"><select id="author-hackerspace-filter-select" class="control-select control-select-country" aria-label="Filter authors by hackerspace"><option value="all" selected={model.selectedHackerspace === "all"}>All hackerspaces</option>{(model.availableHackerspaces || []).map((hackerspace: string) => <option value={hackerspace} selected={model.selectedHackerspace === hackerspace}>{hackerspace}</option>)}</select></label>
          <label class="authors-control authors-control-sort"><select id="author-sort-mode-select" class="control-select" aria-label="Sort authors"><option value="alphabetical" selected={model.sortMode === "alphabetical"}>Alphabetical</option><option value="publication-count" selected={model.sortMode === "publication-count"}>Publication count</option><option value="latest-publication" selected={model.sortMode === "latest-publication"}>Latest publication</option></select></label>
        </div>
        <div id="authors-cards" class="cards">{(model.authors || []).length ? (model.authors || []).map((author: RecordLike) => renderAuthorCard(author)) : <p class="muted">No public authors available.</p>}</div>
        <p id="authors-empty-state" class="muted" hidden={(model.visibleAuthors || []).length !== 0}>No authors match the selected hackerspace.</p>
      </section>,
    ),
  ].join("");
  return renderLayoutShell({ title: "Authors", scriptHrefs: [AUTHORS_INDEX_SCRIPT_HREF], body });
}
