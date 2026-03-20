import { renderDisplayContent } from "../contentDisplay.js";
import {
  escapeHtml,
  renderField,
  renderLayout,
  renderNav,
  renderStatus,
  renderTimelineDate,
} from "./layout.js";

export function renderSpaceDetail(model) {
  const items = (model.items || [])
    .map(
      (item) => `<article class="timeline-entry">
          ${renderTimelineDate(item.publishedAt)}
          <div class="timeline-content">
            <div class="item-header">
              <div class="meta">
                ${renderField("Author", item.author)}
                ${renderField("Original", item.link, true)}
              </div>
            </div>
            <h3 class="item-title">${escapeHtml(item.title || "Untitled item")}</h3>
            ${renderDisplayContent(item)}
            ${item.categories?.length ? `<p class="muted">${escapeHtml(item.categories.join(", "))}</p>` : ""}
          </div>
      </article>`,
    )
    .join("");

  return renderLayout({
    title: model.spaceName,
    body: `
      <section class="panel panel-reading page-shell-narrow page-masthead-compact">
        <h1>${escapeHtml(model.spaceName)}</h1>
        <div class="meta">
          ${renderField("Country", model.country)}
          ${renderField("Wiki", model.sourceWikiUrl, true)}
          ${renderField("Site", model.siteUrl, true)}
          ${renderField("Feed", model.feedUrl, true)}
          ${renderField("Feed type", model.feedType)}
          ${renderStatus(model.status)}
        </div>
        ${model.errorCode ? `<p><span class="field-label">Error:</span> ${escapeHtml(model.errorCode)}</p>` : ""}
      </section>
      <div class="page-shell-narrow">
        ${renderNav([
          { href: model.homeHref, label: "Hackerspaces" },
          { href: model.globalFeedHref, label: "Global Feed" },
        ])}
      </div>
      <section class="feed-list-shell page-shell-narrow timeline-shell-narrow">
        <h2>Publications</h2>
        <p class="muted">${escapeHtml(model.currentPageLabel || "Page 1 of 1")}</p>
        <div class="item-list">${items || `<p class="muted">No publications available.</p>`}</div>
        ${renderPagination(model)}
      </section>
    `,
  });
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

  return `<nav class="pagination" aria-label="Space pagination">
    ${previousLink}
    <span class="pagination-pages">${pageLinks}</span>
    ${nextLink}
  </nav>`;
}
