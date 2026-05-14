/** @jsxImportSource @kitajs/html */

import { loadAboutHtmlBoundary } from "../renderers/aboutHtmlBoundary.js";
import { renderLayout } from "../renderers/layout.js";
import { buildPrimaryNavItems } from "../siteNav.js";
import { renderPageHeaderShell } from "./pageHelpers.js";

const renderLayoutShell = renderLayout as (props: { title: string; body: string; scriptHrefs?: string[] }) => string;

export function renderAboutPageTsx() {
  const aboutHtml = loadAboutHtmlBoundary();
  const body = [
    renderPageHeaderShell({
      title: "About",
      headerClass: "page-header--narrow page-header--compact",
      navItems: buildPrimaryNavItems(null),
      navClass: "page-nav--narrow",
    }),
    String(<section class="page-copy page-copy--narrow about-copy">{aboutHtml}</section>),
  ].join("");

  return renderLayoutShell({ title: "About", body });
}
