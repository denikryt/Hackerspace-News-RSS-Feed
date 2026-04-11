import { FEED_COUNTRY_SELECT_SCRIPT_HREF } from "../renderAssets.js";
import { renderDisplayModel } from "../contentDisplay.js";
import { buildPageSummaryLabel, renderPagination } from "./feedPageShared.js";
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
    .map((item) => {
      // Feed renderers consume prepared displayContent from view models instead
      // of rebuilding display rules from raw item fields at render time.
      return `<article class="timeline-entry">
          ${renderTimelineDate(item.displayDate || item.publishedAt || item.updatedAt)}
          <div class="timeline-axis" aria-hidden="true"></div>
          <div class="timeline-content">
            <div class="item-header item-header-global">
              <div class="meta global-feed-meta">${renderGlobalFeedMeta(item)}</div>
            </div>
            <h3 class="item-title">${escapeHtml(item.title || "Untitled item")}</h3>
            ${renderDisplayModel(item.displayContent)}
          </div>
      </article>`;
    })
    .join("");

  const pageTitle = model.pageTitle || "Feed";
  const pageIntro = model.pageIntro || "All publications sorted from new to old.";
  const streamNavItems = model.streamNavItems || [
    { href: "/feed/index.html", label: "Feed", isCurrent: true },
  ];

  return renderLayout({
    title: pageTitle,
    scriptHrefs: model.countryOptions?.length ? [FEED_COUNTRY_SELECT_SCRIPT_HREF] : [],
    body: `
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
      ${renderCountryControls(model)}
      <section class="feed-list-shell page-shell-narrow timeline-shell-narrow">
        <p class="muted">${escapeHtml(buildPageSummaryLabel(model))}</p>
        <div class="item-list">${items || `<p class="muted">No feed items available.</p>`}</div>
        ${renderPagination(model, "Feed pagination")}
      </section>
    `,
  });
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
  </section>`;
}
