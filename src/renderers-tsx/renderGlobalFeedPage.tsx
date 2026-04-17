import { escapeHtml, renderAboutHeaderLink, renderLayout } from "../renderers/layout.js";
import { renderCountryControls, renderFeedLikePageBody, renderGlobalFeedMeta, type RecordLike } from "./pageHelpers.js";

const renderLayoutShell = renderLayout as (props: { title: string; body: string; scriptHrefs?: string[] }) => string;

export function renderGlobalFeedPageTsx(model: RecordLike) {
  return renderLayoutShell({
    title: model.pageTitle || "Feed",
    body: renderFeedLikePageBody(model, {
      emptyLabel: "No feed items available.",
      timelineEntryClass: "timeline-entry",
      paginationAriaLabel: "Feed pagination",
      renderHeaderIntro: (pageIntro) => `<p class="muted">${renderAboutHeaderLink()} <span>• ${escapeHtml(pageIntro)}</span></p>`,
      renderMeta: renderGlobalFeedMeta,
      renderExtraBody: () => "",
      renderPreList: renderCountryControls,
      resolveNavItems: (value) => [{ href: value.homeHref, label: "Hackerspaces" }, ...(value.streamNavItems || [{ href: "/news/index.html", label: "News", isCurrent: true }])],
    }),
  });
}
