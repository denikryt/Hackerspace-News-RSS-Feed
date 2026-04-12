/** @jsxImportSource @kitajs/html */

import { renderDisplayModel } from "../contentDisplay.js";
import { buildPageSummaryLabel, renderPagination } from "../renderers/feedPageShared.js";
import {
  escapeHtml,
  formatCompactDate,
  renderField,
  renderPageHeader,
  renderTimelineDate,
} from "../renderers/layout.js";
import { renderAuthorLinks } from "../renderers/renderAuthorLinks.js";
import type { PageHeaderNavItem } from "../types/renderContracts.js";

export type RecordLike = Record<string, any>;
export type NavItems = PageHeaderNavItem[];

export const renderPageHeaderShell = renderPageHeader as (props: {
  title: string;
  titleClass?: string;
  introHtml?: string;
  headerClass?: string;
  navItems?: NavItems;
  navClass?: string;
}) => string;

type FeedPageOptions = {
  emptyLabel: string;
  paginationAriaLabel: string;
  renderExtraBody: (item: RecordLike) => string;
  renderHeaderIntro: (pageIntro: string, model: RecordLike) => string;
  renderMeta: (item: RecordLike) => string;
  renderPreList: (model: RecordLike) => string;
  resolveNavItems: (model: RecordLike) => NavItems;
  timelineEntryClass: string;
};

export function renderFeedLikePageBody(model: RecordLike, options: FeedPageOptions) {
  const pageTitle = model.pageTitle || model.spaceName || "Feed";
  const pageIntro = model.pageIntro || "All publications sorted from new to old.";
  const items = (model.items || []).length
    ? (model.items || []).map((item: RecordLike) => renderFeedItem(item, options)).join("")
    : `<p class="muted">${options.emptyLabel}</p>`;

  return [
    renderPageHeaderShell({
      title: pageTitle,
      headerClass: "page-header--narrow page-header--compact",
      introHtml: options.renderHeaderIntro(pageIntro, model),
      navItems: options.resolveNavItems(model),
      navClass: "page-nav--narrow",
    }),
    options.renderPreList(model),
    String(
      <section class="feed-list-shell page-shell-narrow timeline-shell-narrow">
        <p class="muted">{escapeHtml(buildPageSummaryLabel(model))}</p>
        <div class="item-list">{items}</div>
        {renderPagination(model, options.paginationAriaLabel)}
      </section>,
    ),
  ].filter(Boolean).join("");
}

export function renderCountryControls(model: RecordLike) {
  if (!model.countryOptions?.length) {
    return "";
  }

  return String(
    <section class="feed-controls-shell page-shell-narrow">
      <div class="feed-controls feed-controls-country">
        <label class="feed-control feed-control-country">
          <select
            id="feed-country-select"
            class="control-select control-select-country"
            aria-label="Choose feed country"
          >
            {(model.countryOptions || []).map((option: RecordLike) => (
              <option value={option.href} selected={Boolean(option.isSelected)}>
                {escapeHtml(option.label)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>,
  );
}

export function renderGlobalFeedMeta(item: RecordLike) {
  const topLineParts = [];
  if (item.spaceHref) {
    topLineParts.push(String(<span><a class="global-feed-meta-link global-feed-space-link" href={item.spaceHref}>{escapeHtml(item.spaceName || "Hackerspace")}</a></span>));
  }
  if (item.link) {
    topLineParts.push(String(<span><a class="global-feed-meta-link global-feed-original-link" href={item.link}>Source</a></span>));
  }

  const lines = [];
  if (topLineParts.length > 0) {
    lines.push(String(<span class="global-feed-meta-line global-feed-meta-line-primary">{joinWithDot(topLineParts)}</span>));
  }
  if (item.authorLinks?.length) {
    lines.push(String(<span class="global-feed-meta-line global-feed-meta-line-authors">{renderAuthorLinks(item.authorLinks, { linkClass: "global-feed-meta-link global-feed-original-link" })}</span>));
  }
  return lines.join("");
}

export function renderDetailItemMeta(item: RecordLike) {
  const lines = [];
  if (item.link) {
    lines.push(String(<span class="global-feed-meta-line global-feed-meta-line-primary"><span><a class="global-feed-meta-link global-feed-original-link detail-item-meta-link" href={item.link}>Source</a></span></span>));
  }
  if (item.authorLinks?.length) {
    lines.push(String(<span class="global-feed-meta-line global-feed-meta-line-authors">{renderAuthorLinks(item.authorLinks, { linkClass: "global-feed-meta-link global-feed-original-link detail-item-meta-link" })}</span>));
  }
  return lines.join("");
}

export function renderCategories(item: RecordLike) {
  const categories = item.normalizedCategories || item.categoriesRaw;
  return categories?.length ? String(<p class="muted">{escapeHtml(categories.join(", "))}</p>) : "";
}

export function renderSpaceCard(card: RecordLike) {
  return String(
    <article class="card" data-space-name={card.spaceName} data-country={card.country || ""} data-is-failure={card.isFailure ? "true" : "false"} data-default-visible={card.isVisibleByDefault ? "true" : "false"} data-latest-item-date={card.latestItemDate || ""} data-publication-count={card.publicationsCount || 0}>
      <h3><a class="space-card-title" href={card.detailHref}>{escapeHtml(card.spaceName)}</a></h3>
      <div class="meta">{renderField("Country", card.country)}</div>
      <p class="space-card-links">
        {card.sourceWikiUrl ? <a href={card.sourceWikiUrl}>Wiki</a> : ""}
        {card.siteUrl ? <a href={card.siteUrl}>Website</a> : ""}
      </p>
      {typeof card.publicationsCount === "number" ? <p class="muted space-card-publications">{escapeHtml(`${card.publicationsCount} publication${card.publicationsCount === 1 ? "" : "s"}`)}</p> : ""}
      {card.latestItemTitle ? <p><span class="field-label">Latest:</span>{" "}{card.latestItemLink ? <a class="space-card-latest-link" href={card.latestItemLink}>{escapeHtml(card.latestItemTitle)}</a> : escapeHtml(card.latestItemTitle)}</p> : <p class="muted">No latest publication available.</p>}
      {card.latestItemDate ? <p class="space-card-date muted">{escapeHtml(formatCompactDate(card.latestItemDate))}</p> : ""}
    </article>,
  );
}

export function renderAuthorCard(author: RecordLike) {
  return String(
    <article class="card" data-author-name={author.displayName} data-hackerspaces={(author.hackerspaces || []).map((hackerspace: RecordLike) => hackerspace.name).join("|")} data-publication-count={author.itemCount || 0} data-latest-item-date={author.latestItemDate || ""}>
      <h3><a class="author-card-title" href={author.detailHref}>{escapeHtml(author.displayName)}</a></h3>
      <div class="meta">
        <span>{escapeHtml(`${author.itemCount} publication${author.itemCount === 1 ? "" : "s"}`)}</span>
        {author.latestItemDate ? <span>{escapeHtml(formatCompactDate(author.latestItemDate))}</span> : ""}
      </div>
      {author.hackerspaces?.length ? <p class="space-card-links author-card-hackerspaces">{(author.hackerspaces || []).map((hackerspace: RecordLike) => <a class="author-hackerspace-link" href={hackerspace.href}>{escapeHtml(hackerspace.name)}</a>)}</p> : ""}
    </article>,
  );
}

function renderFeedItem(item: RecordLike, options: FeedPageOptions) {
  return String(
    <article class={options.timelineEntryClass}>
      {renderTimelineDate(item.displayDate || item.publishedAt || item.updatedAt)}
      <div class="timeline-axis" aria-hidden="true"></div>
      <div class="timeline-content">
        <div class={`item-header ${options.timelineEntryClass.includes("detail") ? "item-header-detail " : ""}item-header-global`}>
          <div class={`meta global-feed-meta${options.timelineEntryClass.includes("detail") ? " detail-item-meta" : ""}`}>{options.renderMeta(item)}</div>
        </div>
        <h3 class="item-title">{escapeHtml(item.title || "Untitled item")}</h3>
        {renderDisplayModel(item.displayContent)}
        {options.renderExtraBody(item)}
      </div>
    </article>,
  );
}

function joinWithDot(parts: string[]) {
  const result: string[] = [];
  parts.forEach((part, index) => {
    if (index > 0) {
      result.push(String(<span aria-hidden="true">•</span>));
    }
    result.push(part);
  });
  return result.join("");
}
