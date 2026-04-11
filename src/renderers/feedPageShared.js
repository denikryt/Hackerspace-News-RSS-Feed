import { escapeHtml } from "./layout.js";

// Feed-like pages share the same page summary wording.
export function buildPageSummaryLabel(model) {
  const parts = [model.currentPageLabel || "Page 1 of 1"];

  if (model.publicationCountLabel) {
    parts.push(model.publicationCountLabel);
  }

  return parts.join(" · ");
}

// Pagination markup must stay identical across feed, author, and space detail pages.
export function renderPagination(model, ariaLabel) {
  if (!model.totalPages || model.totalPages <= 1) {
    return "";
  }

  const previousLink = model.hasPreviousPage
    ? `<a class="pagination-link" href="${escapeHtml(model.previousPageHref)}">Previous</a>`
    : `<span class="pagination-link disabled">Previous</span>`;

  const nextLink = model.hasNextPage
    ? `<a class="pagination-link" href="${escapeHtml(model.nextPageHref)}">Next</a>`
    : `<span class="pagination-link disabled">Next</span>`;

  const pageLinks = (model.pageLinks || [])
    .map((link) => {
      if (link.type === "ellipsis") {
        return `<span class="pagination-ellipsis">...</span>`;
      }

      const className = link.isCurrent ? "pagination-link current" : "pagination-link";
      return `<a class="${className}" href="${escapeHtml(link.href)}">${escapeHtml(link.page)}</a>`;
    })
    .join("");

  return `<nav class="pagination" aria-label="${escapeHtml(ariaLabel)}">
    ${previousLink}
    <span class="pagination-pages">${pageLinks}</span>
    ${nextLink}
  </nav>`;
}
