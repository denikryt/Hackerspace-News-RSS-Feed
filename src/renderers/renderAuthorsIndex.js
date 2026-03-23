import {
  escapeHtml,
  formatCompactDate,
  renderAboutHeaderLink,
  renderLayout,
  renderPageHeader,
} from "./layout.js";

export function renderAuthorsIndex(model) {
  const homeHref = model.homeHref || "/index.html";
  const allContentHref = model.allContentHref || "/feed/index.html";
  const authorsIndexHref = model.authorsIndexHref || "/authors/index.html";
  const cards = (model.authors || [])
    .map(
      (author) => `<article class="card">
        <h3><a class="author-card-title" href="${author.detailHref}">${escapeHtml(author.displayName)}</a></h3>
        <div class="meta">
          <span>${escapeHtml(`${author.itemCount} publication${author.itemCount === 1 ? "" : "s"}`)}</span>
          ${author.latestItemDate ? `<span>${escapeHtml(formatCompactDate(author.latestItemDate))}</span>` : ""}
        </div>
        ${
          author.hackerspaces?.length
            ? `<p class="space-card-links">${author.hackerspaces
                .map(
                  (hackerspace) =>
                    `<a class="author-hackerspace-link" href="${escapeHtml(hackerspace.href)}">${escapeHtml(hackerspace.name)}</a>`,
                )
                .join("")}</p>`
            : ""
        }
      </article>`,
    )
    .join("");

  return renderLayout({
    title: "Authors",
    body: `
      <style>.author-card-title{color:var(--text);display:inline-block;max-inline-size:100%;overflow-wrap:anywhere;word-break:break-word;}.space-card-links .author-hackerspace-link{color:#111;}</style>
      ${renderPageHeader({
        title: "Authors",
        titleClass: "home-hero-title",
        headerClass: "page-header--wide page-header--compact",
        introHtml: `<p class="muted">${renderAboutHeaderLink()} <span>• All public authors detected from the dataset.</span></p>`,
        navItems: [
          { href: homeHref, label: "Hackerspaces" },
          { href: allContentHref, label: "Feed" },
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
