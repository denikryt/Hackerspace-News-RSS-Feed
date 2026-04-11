import { renderPaginationTsx } from "./tsxSharedRuntime.js";

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
  return renderPaginationTsx(model, ariaLabel);
}
