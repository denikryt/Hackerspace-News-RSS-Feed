import { renderDisplayContent } from "../contentDisplay.js";
import {
  escapeHtml,
  renderField,
  renderLayout,
  renderPageHeader,
  renderTimelineDate,
} from "./layout.js";

export function renderSpaceDetail(model) {
  const items = (model.items || [])
    .map(
      (item) => `<article class="timeline-entry timeline-entry-detail">
          ${renderTimelineDate(item.displayDate || item.publishedAt || item.updatedAt)}
          <div class="timeline-axis" aria-hidden="true"></div>
          <div class="timeline-content">
            <div class="item-header item-header-detail item-header-global">
              <div class="meta global-feed-meta detail-item-meta">
                ${
                  item.resolvedAuthor
                    ? `<span>${renderField("Author", item.resolvedAuthor)}</span>`
                    : ""
                }
                ${
                  item.link
                    ? `<span><a class="global-feed-meta-link detail-item-meta-link" href="${item.link}">Original</a></span>`
                    : ""
                }
              </div>
            </div>
            <h3 class="item-title">${escapeHtml(item.title || "Untitled item")}</h3>
            ${renderDisplayContent(item)}
            ${renderCategories(item)}
          </div>
      </article>`,
    )
    .join("");

  return renderLayout({
    title: model.spaceName,
    body: `
      ${renderPageHeader({
        title: model.spaceName,
        headerClass: "page-header--narrow page-header--compact",
        introHtml: `
        <div class="meta detail-header-meta">
          ${renderField("Country", model.country)}
          ${model.sourceWikiUrl ? `<a class="global-feed-meta-link detail-header-link" href="${model.sourceWikiUrl}">Wiki</a>` : ""}
          ${model.siteUrl ? `<a class="global-feed-meta-link detail-header-link" href="${model.siteUrl}">Website</a>` : ""}
        </div>
        ${model.errorCode ? `<p><span class="field-label">Error:</span> ${escapeHtml(model.errorCode)}</p>` : ""}
        `,
        navItems: [
          { href: model.homeHref, label: "Hackerspaces" },
          { href: model.allContentHref, label: "All" },
        ],
        navClass: "page-nav--narrow",
      })}
      <section class="feed-list-shell page-shell-narrow timeline-shell-narrow">
        <p class="muted">${escapeHtml(buildPageSummaryLabel(model))}</p>
        <div class="item-list">${items || `<p class="muted">No publications available.</p>`}</div>
        ${renderPagination(model)}
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

function renderCategories(item) {
  const categories = item.normalizedCategories || item.categoriesRaw;

  if (!categories?.length) {
    return "";
  }

  return `<p class="muted">${escapeHtml(categories.join(", "))}</p>`;
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
