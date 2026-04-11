/** @jsxImportSource @kitajs/html */

import {
  AUTHORS_INDEX_SCRIPT_HREF,
  FEED_COUNTRY_SELECT_SCRIPT_HREF,
  SPACES_INDEX_SCRIPT_HREF,
} from "../renderAssets.js";
import { renderDisplayModel } from "../contentDisplay.js";
import { loadAboutHtmlBoundary } from "../renderers/aboutHtmlBoundary.js";
import { buildPageSummaryLabel, renderPagination } from "../renderers/feedPageShared.js";
import {
  escapeHtml,
  formatCompactDate,
  renderAboutHeaderLink,
  renderField,
  renderLayout,
  renderMetric,
  renderPageHeader,
  renderTimelineDate,
} from "../renderers/layout.js";
import { renderAuthorLinks } from "../renderers/renderAuthorLinks.js";
import type { PageHeaderNavItem } from "../types/renderContracts.js";

type RecordLike = Record<string, any>;
type NavItems = PageHeaderNavItem[];
const renderLayoutShell = renderLayout as (props: {
  title: string;
  body: string;
  scriptHrefs?: string[];
}) => string;
const renderPageHeaderShell = renderPageHeader as (props: {
  title: string;
  titleClass?: string;
  introHtml?: string;
  headerClass?: string;
  navItems?: NavItems;
  navClass?: string;
}) => string;

// Page-level TSX keeps the structure readable while layout.js remains the
// stable outer-document shell for the current Node runtime contract.
export function renderAboutPageTsx() {
  const aboutHtml = loadAboutHtmlBoundary();
  const navItems: NavItems = [
    { href: "/index.html", label: "Hackerspaces" },
    { href: "/feed/index.html", label: "Feed" },
    { href: "/authors/index.html", label: "Authors" },
  ];
  const body = [
    renderPageHeaderShell({
      title: "About",
      headerClass: "page-header--narrow page-header--compact",
      navItems,
      navClass: "page-nav--narrow",
    }),
    String(
      <section class="page-copy page-copy--narrow about-copy">
        {aboutHtml}
      </section>,
    ),
  ].join("");

  return renderLayoutShell({
    title: "About",
    body,
  });
}

export function renderSpacesIndexPageTsx(model: RecordLike) {
  const lastUpdatedIso = model.generatedAt ? escapeHtml(model.generatedAt) : "";
  const navItems: NavItems = [
    { href: "/index.html", label: "Hackerspaces", isCurrent: true },
    { href: "/feed/index.html", label: "Feed" },
    { href: "/authors/index.html", label: "Authors" },
  ];
  const body = [
    renderPageHeaderShell({
      title: "Hackerspace News",
      titleClass: "home-hero-title",
      headerClass: "page-header--wide page-header--compact",
      introHtml: `<p class="muted"><a class="about-link-muted" href="/about/index.html">About</a>${lastUpdatedIso ? ` <span>• Last updated: <span id="last-updated-label" data-updated-at="${lastUpdatedIso}">${lastUpdatedIso}</span></span>` : ""}</p>`,
      navItems,
      navClass: "page-nav--wide page-nav--compact",
    }),
    String(
      <section class="panel page-summary page-summary--home">
        <div class="summary-grid home-summary-grid">
          {renderMetric("Total spaces", model.summary.sourceRows)}
          {renderMetric("Readable feeds", model.summary.parsedFeeds)}
        </div>
        <div class="spaces-controls">
          <label class="spaces-control spaces-control-search">
            <input
              id="space-search-input"
              class="control-input"
              type="search"
              aria-label="Search hackerspaces"
              value={model.searchQuery || ""}
              placeholder="Search by hackerspace name"
            />
          </label>
          <label class="spaces-control spaces-control-country">
            <select id="country-filter-select" class="control-select control-select-country">
              <option value="all" selected={model.selectedCountry === "all"}>
                All countries
              </option>
              {(model.availableCountries || []).map((country: string) => (
                <option value={country} selected={model.selectedCountry === country}>
                  {escapeHtml(country)}
                </option>
              ))}
            </select>
          </label>
          <label class="spaces-control spaces-control-sort">
            <select id="sort-mode-select" class="control-select">
              <option value="alphabetical" selected={model.sortMode === "alphabetical"}>
                Alphabetical
              </option>
              <option value="publication-count" selected={model.sortMode === "publication-count"}>
                Publication count
              </option>
              <option value="latest-publication" selected={model.sortMode === "latest-publication"}>
                Latest publication
              </option>
            </select>
          </label>
          <label class="spaces-control spaces-control-toggle">
            <input id="show-failed-toggle" type="checkbox" checked={Boolean(model.showFailed)} />
            Show failed feeds
          </label>
        </div>
        <div id="spaces-cards" class="cards">
          {(model.cards || []).map((card: RecordLike) => renderSpaceCard(card))}
        </div>
        <p id="spaces-empty-state" class="muted" hidden>
          No hackerspaces match the selected country.
        </p>
      </section>,
    ),
  ].join("");

  return renderLayoutShell({
    title: "Hackerspace News",
    scriptHrefs: [SPACES_INDEX_SCRIPT_HREF] as string[],
    body,
  });
}

export function renderAuthorsIndexPageTsx(model: RecordLike) {
  const homeHref = model.homeHref || "/index.html";
  const feedHref = model.feedHref || "/feed/index.html";
  const authorsIndexHref = model.authorsIndexHref || "/authors/index.html";
  const navItems: NavItems = [
    { href: homeHref, label: "Hackerspaces" },
    { href: feedHref, label: "Feed" },
    { href: authorsIndexHref, label: "Authors", isCurrent: true },
  ];
  const body = [
    renderPageHeaderShell({
      title: "Authors",
      titleClass: "home-hero-title",
      headerClass: "page-header--wide page-header--compact",
      introHtml: `<p class="muted">${renderAboutHeaderLink()} <span>• All public authors detected from the dataset.</span></p>`,
      navItems,
      navClass: "page-nav--wide page-nav--compact",
    }),
    String(
      <section class="panel page-summary page-summary--home">
        <div class="authors-controls">
          <label class="authors-control authors-control-search">
            <input
              id="author-search-input"
              class="control-input"
              type="search"
              aria-label="Search authors"
              value={model.authorQuery || ""}
              placeholder="Search by author name"
            />
          </label>
          <label class="authors-control authors-control-hackerspace">
            <select
              id="author-hackerspace-filter-select"
              class="control-select control-select-country"
              aria-label="Filter authors by hackerspace"
            >
              <option value="all" selected={model.selectedHackerspace === "all"}>
                All hackerspaces
              </option>
              {(model.availableHackerspaces || []).map((hackerspace: string) => (
                <option
                  value={hackerspace}
                  selected={model.selectedHackerspace === hackerspace}
                >
                  {escapeHtml(hackerspace)}
                </option>
              ))}
            </select>
          </label>
          <label class="authors-control authors-control-sort">
            <select id="author-sort-mode-select" class="control-select" aria-label="Sort authors">
              <option value="alphabetical" selected={model.sortMode === "alphabetical"}>
                Alphabetical
              </option>
              <option value="publication-count" selected={model.sortMode === "publication-count"}>
                Publication count
              </option>
              <option value="latest-publication" selected={model.sortMode === "latest-publication"}>
                Latest publication
              </option>
            </select>
          </label>
        </div>
        <div id="authors-cards" class="cards">
          {(model.authors || []).length
            ? (model.authors || []).map((author: RecordLike) => renderAuthorCard(author))
            : <p class="muted">No public authors available.</p>}
        </div>
        <p id="authors-empty-state" class="muted" hidden={(model.visibleAuthors || []).length !== 0}>
          No authors match the selected hackerspace.
        </p>
      </section>,
    ),
  ].join("");

  return renderLayoutShell({
    title: "Authors",
    scriptHrefs: [AUTHORS_INDEX_SCRIPT_HREF] as string[],
    body,
  });
}

export function renderGlobalFeedPageTsx(model: RecordLike) {
  const scriptHrefs: string[] = model.countryOptions?.length ? [FEED_COUNTRY_SELECT_SCRIPT_HREF] : [];
  return renderLayoutShell({
    title: model.pageTitle || "Feed",
    scriptHrefs,
    body: renderFeedLikePageBody(model, {
      emptyLabel: "No feed items available.",
      timelineEntryClass: "timeline-entry",
      paginationAriaLabel: "Feed pagination",
      renderHeaderIntro: (pageIntro) =>
        `<p class="muted">${renderAboutHeaderLink()} <span>• ${escapeHtml(pageIntro)}</span></p>`,
      renderMeta: renderGlobalFeedMeta,
      renderExtraBody: () => "",
      renderPreList: renderCountryControls,
      resolveNavItems: (value) => [
        { href: value.homeHref, label: "Hackerspaces" },
        ...(value.streamNavItems || [{ href: "/feed/index.html", label: "Feed", isCurrent: true }]),
      ],
    }),
  });
}

export function renderSpaceDetailPageTsx(model: RecordLike) {
  return renderLayoutShell({
    title: model.spaceName,
    body: renderFeedLikePageBody(model, {
      emptyLabel: "No publications available.",
      timelineEntryClass: "timeline-entry timeline-entry-detail",
      paginationAriaLabel: "Space pagination",
      renderHeaderIntro: (pageIntro) =>
        `
        <p class="muted">${renderAboutHeaderLink()}</p>
        <div class="meta detail-header-meta">
          ${renderField("Country", model.country)}
          ${model.sourceWikiUrl ? `<a class="global-feed-meta-link detail-header-link" href="${model.sourceWikiUrl}">Wiki</a>` : ""}
          ${model.siteUrl ? `<a class="global-feed-meta-link detail-header-link" href="${model.siteUrl}">Website</a>` : ""}
        </div>
        ${model.errorCode ? `<p><span class="field-label">Error:</span> ${escapeHtml(model.errorCode)}</p>` : ""}
        `,
      renderMeta: renderDetailItemMeta,
      renderExtraBody: renderCategories,
      renderPreList: () => "",
      resolveNavItems: (value) => [
        { href: value.homeHref, label: "Hackerspaces" },
        { href: value.feedHref, label: "Feed" },
        { href: value.authorsIndexHref, label: "Authors" },
      ],
    }),
  });
}

export function renderAuthorDetailPageTsx(model: RecordLike) {
  const sourceLabel = (model.authorSources || []).length
    ? `Observed via ${model.authorSources.join(", ")}.`
    : "Author extracted from the dataset.";
  const derivedTotalPages =
    model.totalPages
    || Math.max(1, (model.pageLinks || []).filter((link: RecordLike) => link.type === "page").length);
  const derivedCurrentPage =
    model.currentPage
    || model.pageLinks?.find((link: RecordLike) => link.type === "page" && link.isCurrent)?.page
    || 1;

  return renderGlobalFeedPageTsx({
    ...model,
    totalPages: derivedTotalPages,
    currentPage: derivedCurrentPage,
    pageTitle: model.authorDisplayName,
    pageIntro: `${model.publicationCountLabel || ""} ${sourceLabel}`.trim(),
    streamNavItems: [
      { href: model.feedHref, label: "Feed", isCurrent: false },
      { href: model.authorsIndexHref, label: "Authors", isCurrent: false },
      {
        href: model.canonicalHref || model.authorsIndexHref,
        label: model.authorDisplayName,
        isCurrent: true,
      },
    ],
  });
}

type FeedPageOptions = {
  emptyLabel: string;
  paginationAriaLabel: string;
  renderExtraBody: (item: RecordLike) => string;
  renderHeaderIntro: (pageIntro: string) => string;
  renderMeta: (item: RecordLike) => string;
  renderPreList: (model: RecordLike) => string;
  resolveNavItems: (model: RecordLike) => RecordLike[];
  timelineEntryClass: string;
};

function renderFeedLikePageBody(model: RecordLike, options: FeedPageOptions) {
  const pageTitle = model.pageTitle || model.spaceName || "Feed";
  const pageIntro = model.pageIntro || "All publications sorted from new to old.";
  const items = (model.items || []).length
    ? (model.items || []).map((item: RecordLike) => renderFeedItem(item, options)).join("")
    : `<p class="muted">${options.emptyLabel}</p>`;

  return [
    renderPageHeaderShell({
      title: pageTitle,
      headerClass: "page-header--narrow page-header--compact",
      introHtml: options.renderHeaderIntro(pageIntro),
      navItems: options.resolveNavItems(model) as NavItems,
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

function renderFeedItem(item: RecordLike, options: FeedPageOptions) {
  return String(
    <article class={options.timelineEntryClass}>
      {renderTimelineDate(item.displayDate || item.publishedAt || item.updatedAt)}
      <div class="timeline-axis" aria-hidden="true"></div>
      <div class="timeline-content">
        <div class={`item-header ${options.timelineEntryClass.includes("detail") ? "item-header-detail " : ""}item-header-global`}>
          <div class={`meta global-feed-meta${options.timelineEntryClass.includes("detail") ? " detail-item-meta" : ""}`}>
            {options.renderMeta(item)}
          </div>
        </div>
        <h3 class="item-title">{escapeHtml(item.title || "Untitled item")}</h3>
        {renderDisplayModel(item.displayContent)}
        {options.renderExtraBody(item)}
      </div>
    </article>,
  );
}

function renderCountryControls(model: RecordLike) {
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

function renderGlobalFeedMeta(item: RecordLike) {
  const topLineParts = [];

  if (item.spaceHref) {
    topLineParts.push(
      String(
        <span>
          <a class="global-feed-meta-link global-feed-space-link" href={item.spaceHref}>
            {escapeHtml(item.spaceName || "Hackerspace")}
          </a>
        </span>,
      ),
    );
  }

  if (item.link) {
    topLineParts.push(
      String(
        <span>
          <a class="global-feed-meta-link global-feed-original-link" href={item.link}>
            Source
          </a>
        </span>,
      ),
    );
  }

  const lines = [];

  if (topLineParts.length > 0) {
    lines.push(
      String(
        <span class="global-feed-meta-line global-feed-meta-line-primary">
          {joinWithDot(topLineParts)}
        </span>,
      ),
    );
  }

  if (item.authorLinks?.length) {
    lines.push(
      String(
        <span class="global-feed-meta-line global-feed-meta-line-authors">
          {renderAuthorLinks(item.authorLinks, {
            linkClass: "global-feed-meta-link global-feed-original-link",
          })}
        </span>,
      ),
    );
  }

  return lines.join("");
}

function renderDetailItemMeta(item: RecordLike) {
  const lines = [];

  if (item.link) {
    lines.push(
      String(
        <span class="global-feed-meta-line global-feed-meta-line-primary">
          <span>
            <a class="global-feed-meta-link global-feed-original-link detail-item-meta-link" href={item.link}>
              Source
            </a>
          </span>
        </span>,
      ),
    );
  }

  if (item.authorLinks?.length) {
    lines.push(
      String(
        <span class="global-feed-meta-line global-feed-meta-line-authors">
          {renderAuthorLinks(item.authorLinks, {
            linkClass: "global-feed-meta-link global-feed-original-link detail-item-meta-link",
          })}
        </span>,
      ),
    );
  }

  return lines.join("");
}

function renderCategories(item: RecordLike) {
  const categories = item.normalizedCategories || item.categoriesRaw;
  if (!categories?.length) {
    return "";
  }

  return String(<p class="muted">{escapeHtml(categories.join(", "))}</p>);
}

function renderSpaceCard(card: RecordLike) {
  return String(
    <article
      class="card"
      data-space-name={card.spaceName}
      data-country={card.country || ""}
      data-is-failure={card.isFailure ? "true" : "false"}
      data-default-visible={card.isVisibleByDefault ? "true" : "false"}
      data-latest-item-date={card.latestItemDate || ""}
      data-publication-count={card.publicationsCount || 0}
    >
      <h3>
        <a class="space-card-title" href={card.detailHref}>
          {escapeHtml(card.spaceName)}
        </a>
      </h3>
      <div class="meta">
        {renderField("Country", card.country)}
      </div>
      <p class="space-card-links">
        {card.sourceWikiUrl ? <a href={card.sourceWikiUrl}>Wiki</a> : ""}
        {card.siteUrl ? <a href={card.siteUrl}>Website</a> : ""}
      </p>
      {typeof card.publicationsCount === "number"
        ? <p class="muted space-card-publications">{escapeHtml(`${card.publicationsCount} publication${card.publicationsCount === 1 ? "" : "s"}`)}</p>
        : ""}
      {card.latestItemTitle
        ? (
          <p>
            <span class="field-label">Latest:</span>{" "}
            {card.latestItemLink
              ? <a class="space-card-latest-link" href={card.latestItemLink}>{escapeHtml(card.latestItemTitle)}</a>
              : escapeHtml(card.latestItemTitle)}
          </p>
        )
        : <p class="muted">No latest publication available.</p>}
      {card.latestItemDate
        ? <p class="space-card-date muted">{escapeHtml(formatCompactDate(card.latestItemDate))}</p>
        : ""}
    </article>,
  );
}

function renderAuthorCard(author: RecordLike) {
  return String(
    <article
      class="card"
      data-author-name={author.displayName}
      data-hackerspaces={(author.hackerspaces || []).map((hackerspace: RecordLike) => hackerspace.name).join("|")}
      data-publication-count={author.itemCount || 0}
      data-latest-item-date={author.latestItemDate || ""}
    >
      <h3>
        <a class="author-card-title" href={author.detailHref}>
          {escapeHtml(author.displayName)}
        </a>
      </h3>
      <div class="meta">
        <span>{escapeHtml(`${author.itemCount} publication${author.itemCount === 1 ? "" : "s"}`)}</span>
        {author.latestItemDate ? <span>{escapeHtml(formatCompactDate(author.latestItemDate))}</span> : ""}
      </div>
      {author.hackerspaces?.length
        ? (
          <p class="space-card-links author-card-hackerspaces">
            {(author.hackerspaces || []).map((hackerspace: RecordLike) => (
              <a class="author-hackerspace-link" href={hackerspace.href}>
                {escapeHtml(hackerspace.name)}
              </a>
            ))}
          </p>
        )
        : ""}
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
