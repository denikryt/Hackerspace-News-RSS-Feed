import { AUTHORS_INDEX_SCRIPT_HREF } from "../renderAssets.js";
import {
  escapeHtml,
  formatCompactDate,
  renderAboutHeaderLink,
  renderLayout,
  renderPageHeader,
} from "./layout.js";

export function renderAuthorsIndex(model) {
  const homeHref = model.homeHref || "/index.html";
  const feedHref = model.feedHref || "/feed/index.html";
  const authorsIndexHref = model.authorsIndexHref || "/authors/index.html";
  const hackerspaceOptions = [
    `<option value="all"${model.selectedHackerspace === "all" ? " selected" : ""}>All hackerspaces</option>`,
    ...(model.availableHackerspaces || []).map(
      (hackerspace) =>
        `<option value="${escapeHtml(hackerspace)}"${model.selectedHackerspace === hackerspace ? " selected" : ""}>${escapeHtml(hackerspace)}</option>`,
    ),
  ].join("");
  const cards = (model.authors || [])
    .map(
      (author) => `<article class="card"
        data-author-name="${escapeHtml(author.displayName)}"
        data-hackerspaces="${escapeHtml((author.hackerspaces || []).map((hackerspace) => hackerspace.name).join("|"))}"
        data-publication-count="${author.itemCount || 0}"
        data-latest-item-date="${escapeHtml(author.latestItemDate || "")}">
        <h3><a class="author-card-title" href="${author.detailHref}">${escapeHtml(author.displayName)}</a></h3>
        <div class="meta">
          <span>${escapeHtml(`${author.itemCount} publication${author.itemCount === 1 ? "" : "s"}`)}</span>
          ${author.latestItemDate ? `<span>${escapeHtml(formatCompactDate(author.latestItemDate))}</span>` : ""}
        </div>
        ${
          author.hackerspaces?.length
            ? `<p class="space-card-links author-card-hackerspaces">${author.hackerspaces
                .map(
                  (hackerspace) =>
                    `<a class="author-hackerspace-link" href="${escapeHtml(hackerspace.href)}">${escapeHtml(hackerspace.name)}</a>`,
                )
                .join("")}</p>`
            : ""
        }
      </article>`,
    )
    .join("");

  return renderLayout({
    title: "Authors",
    scriptHrefs: [AUTHORS_INDEX_SCRIPT_HREF],
    body: `
      ${renderPageHeader({
        title: "Authors",
        titleClass: "home-hero-title",
        headerClass: "page-header--wide page-header--compact",
        introHtml: `<p class="muted">${renderAboutHeaderLink()} <span>• All public authors detected from the dataset.</span></p>`,
        navItems: [
          { href: homeHref, label: "Hackerspaces" },
          { href: feedHref, label: "Feed" },
          { href: authorsIndexHref, label: "Authors", isCurrent: true },
        ],
        navClass: "page-nav--wide page-nav--compact",
      })}
      <section class="panel page-summary page-summary--home">
        <div class="authors-controls">
          <label class="authors-control authors-control-search">
            <input
              id="author-search-input"
              class="control-input"
              type="search"
              aria-label="Search authors"
              value="${escapeHtml(model.authorQuery || "")}"
              placeholder="Search by author name" />
          </label>
          <label class="authors-control authors-control-hackerspace">
            <select
              id="author-hackerspace-filter-select"
              class="control-select control-select-country"
              aria-label="Filter authors by hackerspace">
              ${hackerspaceOptions}
            </select>
          </label>
          <label class="authors-control authors-control-sort">
            <select
              id="author-sort-mode-select"
              class="control-select"
              aria-label="Sort authors">
              <option value="alphabetical"${model.sortMode === "alphabetical" ? " selected" : ""}>Alphabetical</option>
              <option value="publication-count"${model.sortMode === "publication-count" ? " selected" : ""}>Publication count</option>
              <option value="latest-publication"${model.sortMode === "latest-publication" ? " selected" : ""}>Latest publication</option>
            </select>
          </label>
        </div>
        <div id="authors-cards" class="cards">${cards || `<p class="muted">No public authors available.</p>`}</div>
        <p id="authors-empty-state" class="muted"${(model.visibleAuthors || []).length === 0 ? "" : " hidden"}>No authors match the selected hackerspace.</p>
      </section>
    `,
  });
}
