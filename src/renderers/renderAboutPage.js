import { renderLayout, renderPageHeader } from "./layout.js";
import { loadAboutHtmlBoundary } from "./aboutHtmlBoundary.js";

export function renderAboutPage() {
  const aboutHtml = loadAboutHtmlBoundary();

  return renderLayout({
    title: "About",
    body: `
      ${renderPageHeader({
        title: "About",
        headerClass: "page-header--narrow page-header--compact",
        navItems: [
          { href: "/index.html", label: "Hackerspaces" },
          { href: "/feed/index.html", label: "Feed" },
          { href: "/authors/index.html", label: "Authors" },
        ],
        navClass: "page-nav--narrow",
      })}
      <section class="page-copy page-copy--narrow about-copy">
        ${aboutHtml}
      </section>
    `,
  });
}
