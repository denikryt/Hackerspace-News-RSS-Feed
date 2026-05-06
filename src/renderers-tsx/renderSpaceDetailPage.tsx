import { escapeHtml, renderAboutHeaderLink, renderField, renderLayout } from "../renderers/layout.js";
import { getCuratedHref } from "../sitePaths.js";
import { renderCategories, renderDetailItemMeta, renderFeedLikePageBody, type RecordLike } from "./pageHelpers.js";

const renderLayoutShell = renderLayout as (props: { title: string; body: string; scriptHrefs?: string[] }) => string;

export function renderSpaceDetailPageTsx(model: RecordLike) {
  return renderLayoutShell({
    title: model.spaceName,
    body: renderFeedLikePageBody(model, {
      emptyLabel: "No publications available.",
      timelineEntryClass: "timeline-entry timeline-entry-detail",
      paginationAriaLabel: "Space pagination",
      renderHeaderIntro: (_pageIntro, currentModel) => `
        <p class="muted">${renderAboutHeaderLink()}</p>
        <div class="meta detail-header-meta">
          ${renderField("Country", currentModel.country)}
          ${currentModel.sourceWikiUrl ? `<a class="global-feed-meta-link detail-header-link" href="${currentModel.sourceWikiUrl}">Wiki</a>` : ""}
          ${currentModel.siteUrl ? `<a class="global-feed-meta-link detail-header-link" href="${currentModel.siteUrl}">Website</a>` : ""}
        </div>
        ${currentModel.errorCode ? `<p><span class="field-label">Error:</span> ${escapeHtml(currentModel.errorCode)}</p>` : ""}
        `,
      renderMeta: renderDetailItemMeta,
      renderExtraBody: renderCategories,
      renderPreList: () => "",
      resolveNavItems: (value) => [
        { href: value.homeHref, label: "Hackerspaces" },
        { href: value.feedHref, label: "News" },
        { href: getCuratedHref(), label: "Curated" },
        { href: value.authorsIndexHref, label: "Authors" },
      ],
    }),
  });
}
