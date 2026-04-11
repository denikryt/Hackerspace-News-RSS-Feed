/** @jsxImportSource @kitajs/html */

import type {
  AuthorLink,
  PageHeaderNavItem,
  RenderPaginationModel,
  RenderPageHeaderProps,
} from "../types/renderContracts.js";

// The TSX trial is limited to shared primitives so we can compare readability without rewriting page renderers.
function AuthorLinksMarkup({
  authorLinks,
  labelClass,
  linkClass,
}: {
  authorLinks: AuthorLink[];
  labelClass: string;
  linkClass: string;
}) {
  const label = authorLinks.length === 1 ? "Author" : "Authors";

  return (
    <span>
      <span class={labelClass}>{`${label}:&nbsp;`}</span>
      {authorLinks.map((author, index) => (
        <>
          {index > 0 ? ", " : ""}
          <a class={linkClass} href={author.href} safe>
            {author.label}
          </a>
        </>
      ))}
    </span>
  );
}

function NavMarkup({ items }: { items: PageHeaderNavItem[] }) {
  return (
    <nav class="section-nav">
      {items.map((item) => (
        <a href={item.href} aria-current={item.isCurrent ? "page" : undefined} safe>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

function PageHeaderMarkup({
  title,
  titleClass = "",
  introHtml = "",
  headerClass = "",
  navItems = [],
  navClass = "",
}: RenderPageHeaderProps) {
  const sectionClass = ["panel", "page-header", headerClass].filter(Boolean).join(" ");
  const wrappedNavHtml = navItems.length > 0
    ? navClass
      ? <div class={`page-nav ${navClass}`}>{NavMarkup({ items: navItems })}</div>
      : NavMarkup({ items: navItems })
    : "";

  return (
    <>
      <section class={sectionClass}>
        {titleClass ? (
          <h1 class={titleClass} safe>
            {title}
          </h1>
        ) : (
          <h1 safe>{title}</h1>
        )}
        {introHtml}
      </section>
      {wrappedNavHtml}
    </>
  );
}

function PaginationMarkup({
  model,
  ariaLabel,
}: {
  ariaLabel: string;
  model: RenderPaginationModel;
}) {
  const previousLink = model.hasPreviousPage
    ? <a class="pagination-link" href={model.previousPageHref}>Previous</a>
    : <span class="pagination-link disabled">Previous</span>;

  const nextLink = model.hasNextPage
    ? <a class="pagination-link" href={model.nextPageHref}>Next</a>
    : <span class="pagination-link disabled">Next</span>;

  const pageLinks = (model.pageLinks || []).map((link) => {
    if (link.type === "ellipsis") {
      return <span class="pagination-ellipsis">...</span>;
    }

    return (
      <a class={link.isCurrent ? "pagination-link current" : "pagination-link"} href={link.href} safe>
        {String(link.page)}
      </a>
    );
  });

  return (
    <nav class="pagination" aria-label={ariaLabel}>
      {previousLink}
      <span class="pagination-pages">{pageLinks}</span>
      {nextLink}
    </nav>
  );
}

export function renderAuthorLinksTsx(
  authorLinks: AuthorLink[] | undefined,
  { linkClass = "", labelClass = "field-label" }: { labelClass?: string; linkClass?: string } = {},
) {
  if (!authorLinks?.length) {
    return "";
  }

  return String(AuthorLinksMarkup({ authorLinks, labelClass, linkClass }));
}

export function renderPageHeaderTsx(props: RenderPageHeaderProps) {
  const { title, titleClass = "", introHtml = "", headerClass = "", navItems = [], navClass = "" } = props;
  const sectionClass = ["panel", "page-header", headerClass].filter(Boolean).join(" ");
  const titleHtml = titleClass
    ? String(<h1 class={titleClass} safe>{title}</h1>)
    : String(<h1 safe>{title}</h1>);
  const wrappedNavHtml = navItems.length > 0
    ? navClass
      ? `<div class="page-nav ${navClass}">${String(NavMarkup({ items: navItems }))}</div>`
      : String(NavMarkup({ items: navItems }))
    : "";

  return `
      <section class="${sectionClass}">
        ${titleHtml}
        ${introHtml}
      </section>
      ${wrappedNavHtml}
    `;
}

export function renderPaginationTsx(model: RenderPaginationModel, ariaLabel: string) {
  if (!model.totalPages || model.totalPages <= 1) {
    return "";
  }

  const previousLink = model.hasPreviousPage
    ? String(<a class="pagination-link" href={model.previousPageHref}>Previous</a>)
    : String(<span class="pagination-link disabled">Previous</span>);
  const nextLink = model.hasNextPage
    ? String(<a class="pagination-link" href={model.nextPageHref}>Next</a>)
    : String(<span class="pagination-link disabled">Next</span>);
  const pageLinks = String(
    <span class="pagination-pages">
      {(model.pageLinks || []).map((link) => {
        if (link.type === "ellipsis") {
          return <span class="pagination-ellipsis">...</span>;
        }

        return (
          <a class={link.isCurrent ? "pagination-link current" : "pagination-link"} href={link.href} safe>
            {String(link.page)}
          </a>
        );
      })}
    </span>,
  );

  return `<nav class="pagination" aria-label="${ariaLabel}">
    ${previousLink}
    ${pageLinks}
    ${nextLink}
  </nav>`;
}
