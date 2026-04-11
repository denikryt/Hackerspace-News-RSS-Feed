import { buildDisplayContent, renderDisplayModel } from "../contentDisplay.js";
import { buildPageSummaryLabel, renderPagination } from "./feedPageShared.js";
import { renderAuthorLinks } from "./renderAuthorLinks.js";
import {
  escapeHtml,
  renderAboutHeaderLink,
  renderLayout,
  renderPageHeader,
  renderTimelineDate,
  renderField,
} from "./layout.js";

export function renderSpaceDetail(model) {
  const items = (model.items || [])
    .map((item) => {
      const displayContent = item.displayContent || buildDisplayContent(item);

      return `<article class="timeline-entry timeline-entry-detail">
          ${renderTimelineDate(item.displayDate || item.publishedAt || item.updatedAt)}
          <div class="timeline-axis" aria-hidden="true"></div>
          <div class="timeline-content">
            <div class="item-header item-header-detail item-header-global">
              <div class="meta global-feed-meta detail-item-meta">${renderDetailItemMeta(item)}</div>
            </div>
            <h3 class="item-title">${escapeHtml(item.title || "Untitled item")}</h3>
            ${renderDisplayModel(displayContent)}
            ${renderCategories(item)}
          </div>
      </article>`;
    })
    .join("");

  return renderLayout({
    title: model.spaceName,
    body: `
      ${renderPageHeader({
        title: model.spaceName,
        headerClass: "page-header--narrow page-header--compact",
        introHtml: `
        <p class="muted">${renderAboutHeaderLink()}</p>
        <div class="meta detail-header-meta">
          ${renderField("Country", model.country)}
          ${model.sourceWikiUrl ? `<a class="global-feed-meta-link detail-header-link" href="${model.sourceWikiUrl}">Wiki</a>` : ""}
          ${model.siteUrl ? `<a class="global-feed-meta-link detail-header-link" href="${model.siteUrl}">Website</a>` : ""}
        </div>
        ${model.errorCode ? `<p><span class="field-label">Error:</span> ${escapeHtml(model.errorCode)}</p>` : ""}
        `,
        navItems: [
          { href: model.homeHref, label: "Hackerspaces" },
          { href: model.feedHref, label: "Feed" },
          { href: model.authorsIndexHref, label: "Authors" },
        ],
        navClass: "page-nav--narrow",
      })}
      <section class="feed-list-shell page-shell-narrow timeline-shell-narrow">
        <p class="muted">${escapeHtml(buildPageSummaryLabel(model))}</p>
        <div class="item-list">${items || `<p class="muted">No publications available.</p>`}</div>
        ${renderPagination(model, "Space pagination")}
      </section>
    `,
  });
}

function renderCategories(item) {
  const categories = item.normalizedCategories || item.categoriesRaw;

  if (!categories?.length) {
    return "";
  }

  return `<p class="muted">${escapeHtml(categories.join(", "))}</p>`;
}

function renderDetailItemMeta(item) {
  const lines = [];

  if (item.link) {
    lines.push(
      `<span class="global-feed-meta-line global-feed-meta-line-primary"><span><a class="global-feed-meta-link global-feed-original-link detail-item-meta-link" href="${item.link}">Source</a></span></span>`,
    );
  }

  if (item.authorLinks?.length) {
    lines.push(
      `<span class="global-feed-meta-line global-feed-meta-line-authors">${renderAuthorLinks(item.authorLinks, {
        linkClass: "global-feed-meta-link global-feed-original-link detail-item-meta-link",
      })}</span>`,
    );
  }

  return lines.join("");
}
