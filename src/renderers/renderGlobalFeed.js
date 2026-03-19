import { renderDisplayContent } from "../contentDisplay.js";
import { escapeHtml, renderField, renderLayout, renderNav } from "./layout.js";

export function renderGlobalFeed(model) {
  const items = model.items
    .map(
      (item) => `<article class="item">
        <div class="item-inner">
        <h3>${escapeHtml(item.title || "Untitled item")}</h3>
        <div class="meta">
          ${renderField("Space", item.spaceName)}
          <span><span class="field-label">Space page:</span> <a href="${item.spaceHref}">${escapeHtml(item.spaceName)}</a></span>
          ${renderField("Date", item.publishedAt)}
          ${renderField("Original", item.link, true)}
        </div>
        ${renderDisplayContent(item)}
        </div>
      </article>`,
    )
    .join("");

  const pagination = renderPagination(model);

  return renderLayout({
    title: "Global Feed",
    body: `
      <section class="panel panel-reading">
        <h1>Global Feed</h1>
        <p class="muted">All publications sorted from new to old.</p>
        <p class="muted">${escapeHtml(model.currentPageLabel || "Page 1 of 1")}</p>
      </section>
      ${renderNav([
        { href: model.homeHref, label: "Hackerspaces" },
        { href: "/feed/index.html", label: "Global Feed", isCurrent: true },
      ])}
      <section class="feed-list-shell">
        <div class="item-list">${items || `<p class="muted">No feed items available.</p>`}</div>
        ${pagination}
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

  return `<nav class="pagination" aria-label="Feed pagination">
    ${previousLink}
    <span class="pagination-pages">${pageLinks}</span>
    ${nextLink}
  </nav>`;
}
