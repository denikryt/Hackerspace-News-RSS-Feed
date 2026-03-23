import {
  escapeHtml,
  formatCompactDate,
  renderLayout,
  renderPageHeader,
} from "./layout.js";

export function renderAuthorsIndex(model) {
  const homeHref = model.homeHref || "/index.html";
  const allContentHref = model.allContentHref || "/all/index.html";
  const authorsIndexHref = model.authorsIndexHref || "/authors/index.html";
  const cards = (model.authors || [])
    .map(
      (author) => `<article class="card">
        <h3><a class="space-card-title" href="${author.detailHref}">${escapeHtml(author.displayName)}</a></h3>
        <div class="meta">
          <span>${escapeHtml(`${author.itemCount} publication${author.itemCount === 1 ? "" : "s"}`)}</span>
          ${author.latestItemDate ? `<span>${escapeHtml(formatCompactDate(author.latestItemDate))}</span>` : ""}
        </div>
      </article>`,
    )
    .join("");

  return renderLayout({
    title: "Authors",
    body: `
      ${renderPageHeader({
        title: "Authors",
        titleClass: "home-hero-title",
        headerClass: "page-header--wide page-header--compact",
        introHtml: `<p class="muted">All public authors detected from the dataset.</p>`,
        navItems: [
          { href: homeHref, label: "Hackerspaces" },
          { href: allContentHref, label: "All" },
          { href: authorsIndexHref, label: "Authors", isCurrent: true },
        ],
        navClass: "page-nav--wide page-nav--compact",
      })}
      <section class="panel page-summary page-summary--home">
        <div class="cards">${cards || `<p class="muted">No public authors available.</p>`}</div>
      </section>
    `,
  });
}
