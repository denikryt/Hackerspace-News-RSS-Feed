import { renderDisplayContent } from "../contentDisplay.js";
import { renderAuthorLinks } from "./renderAuthorLinks.js";
import {
  escapeHtml,
  renderAboutHeaderLink,
  renderLayout,
  renderPageHeader,
  renderTimelineDate,
} from "./layout.js";

export function renderGlobalFeed(model) {
  const items = model.items
    .map(
      (item) => `<article class="timeline-entry">
          ${renderTimelineDate(item.displayDate || item.publishedAt || item.updatedAt)}
          <div class="timeline-axis" aria-hidden="true"></div>
          <div class="timeline-content">
            <div class="item-header item-header-global">
              <div class="meta global-feed-meta">${renderGlobalFeedMeta(item)}</div>
            </div>
            <h3 class="item-title">${escapeHtml(item.title || "Untitled item")}</h3>
            ${renderDisplayContent(item)}
          </div>
      </article>`,
    )
    .join("");

  const pagination = renderPagination(model);
  const pageTitle = model.pageTitle || "Feed";
  const pageIntro = model.pageIntro || "All publications sorted from new to old.";
  const streamNavItems = model.streamNavItems || [
    { href: "/feed/index.html", label: "Feed", isCurrent: true },
  ];
  const controls = renderCountryControls(model);

  return renderLayout({
    title: pageTitle,
    body: `
      <style>.feed-controls-shell{margin:0 auto 18px;}.feed-controls{display:grid;grid-template-columns:minmax(0,1fr);column-gap:18px;row-gap:10px;align-items:end;}.feed-control{display:block;min-inline-size:0;}.feed-control .control-select{max-inline-size:100%;}.feed-control-country .control-select{inline-size:min(100%, 16rem);}@media (max-width: 720px){.feed-control-country .control-select{inline-size:100%;}}</style>
      ${renderPageHeader({
        title: pageTitle,
        headerClass: "page-header--narrow page-header--compact",
        introHtml: `<p class="muted">${renderAboutHeaderLink()} <span>• ${escapeHtml(pageIntro)}</span></p>`,
        navItems: [
          { href: model.homeHref, label: "Hackerspaces" },
          ...streamNavItems,
        ],
        navClass: "page-nav--narrow",
      })}
      ${controls}
      <section class="feed-list-shell page-shell-narrow timeline-shell-narrow">
        <p class="muted">${escapeHtml(buildPageSummaryLabel(model))}</p>
        <div class="item-list">${items || `<p class="muted">No feed items available.</p>`}</div>
        ${pagination}
      </section>
    `,
  });
}

function buildPageSummaryLabel(model) {
  const parts = [model.currentPageLabel || "Page 1 of 1"];

  if (model.publicationCountLabel) {
    parts.push(model.publicationCountLabel);
  }

  return parts.join(" · ");
}

function renderGlobalFeedMeta(item) {
  const topLineParts = [];

  if (item.spaceHref) {
    topLineParts.push(
      `<span><a class="global-feed-meta-link global-feed-space-link" href="${item.spaceHref}">${escapeHtml(item.spaceName || "Hackerspace")}</a></span>`,
    );
  }

  if (item.link) {
    topLineParts.push(
      `<span><a class="global-feed-meta-link global-feed-original-link" href="${item.link}">Source</a></span>`,
    );
  }

  const lines = [];

  if (topLineParts.length > 0) {
    lines.push(
      `<span class="global-feed-meta-line global-feed-meta-line-primary">${topLineParts.join('<span aria-hidden="true">•</span>')}</span>`,
    );
  }

  if (item.authorLinks?.length) {
    lines.push(
      `<span class="global-feed-meta-line global-feed-meta-line-authors">${renderAuthorLinks(item.authorLinks, {
        linkClass: "global-feed-meta-link global-feed-original-link",
      })}</span>`,
    );
  }

  return lines.join("");
}

function renderCountryControls(model) {
  if (!model.countryOptions?.length) {
    return "";
  }

  const options = model.countryOptions
    .map(
      (option) =>
        `<option value="${escapeHtml(option.href)}"${option.isSelected ? " selected" : ""}>${escapeHtml(option.label)}</option>`,
    )
    .join("");

  return `<section class="feed-controls-shell page-shell-narrow">
    <div class="feed-controls feed-controls-country">
      <label class="feed-control feed-control-country">
        <select
          id="feed-country-select"
          class="control-select control-select-country"
          aria-label="Choose feed country">
          ${options}
        </select>
      </label>
    </div>
  </section>
  <script>
    const feedCountrySelect = document.getElementById("feed-country-select");
    if (feedCountrySelect) {
      feedCountrySelect.addEventListener("change", () => {
        if (feedCountrySelect.value) {
          window.location.href = feedCountrySelect.value;
        }
      });
    }
  </script>`;
}

function renderPagination(model) {
  if (!model.totalPages || model.totalPages <= 1) {
    return "";
  }

  const previousLink = model.hasPreviousPage
    ? `<a class="pagination-link" href="${model.previousPageHref}">Previous</a>`
    : `<span class="pagination-link disabled">Previous</span>`;

  const nextLink = model.hasNextPage
    ? `<a class="pagination-link" href="${model.nextPageHref}">Next</a>`
    : `<span class="pagination-link disabled">Next</span>`;

  const pageLinks = (model.pageLinks || [])
    .map((link) => {
      if (link.type === "ellipsis") {
        return `<span class="pagination-ellipsis">...</span>`;
      }

      const className = link.isCurrent ? "pagination-link current" : "pagination-link";
      return `<a class="${className}" href="${link.href}">${link.page}</a>`;
    })
    .join("");

  return `<nav class="pagination" aria-label="Feed pagination">
    ${previousLink}
    <span class="pagination-pages">${pageLinks}</span>
    ${nextLink}
  </nav>`;
}
