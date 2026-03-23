import { renderDisplayContent } from "../contentDisplay.js";
import { renderAuthorLinks } from "./renderAuthorLinks.js";
import {
  escapeHtml,
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
              <div class="meta global-feed-meta">
                ${
                  item.spaceHref
                    ? `<span><a class="global-feed-meta-link global-feed-space-link" href="${item.spaceHref}">${escapeHtml(item.spaceName || "Hackerspace")}</a></span>`
                    : ""
                }
                ${renderAuthorLinks(item.authorLinks, { linkClass: "global-feed-meta-link global-feed-original-link" })}
                ${
                  item.link
                    ? `<span><a class="global-feed-meta-link global-feed-original-link" href="${item.link}">Original</a></span>`
                    : ""
                }
              </div>
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

  return renderLayout({
    title: pageTitle,
    body: `
      ${renderPageHeader({
        title: pageTitle,
        headerClass: "page-header--narrow page-header--compact",
        introHtml: `<p class="muted">${escapeHtml(pageIntro)}</p>`,
        navItems: [
          { href: model.homeHref, label: "Hackerspaces" },
          ...streamNavItems,
        ],
        navClass: "page-nav--narrow",
      })}
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
