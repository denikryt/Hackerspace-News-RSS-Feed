import { FEED_COUNTRY_SELECT_SCRIPT_HREF } from "../renderAssets.js";
import { escapeHtml, renderAboutHeaderLink, renderLayout } from "../renderers/layout.js";
import { renderCountryControls, renderFeedLikePageBody, renderGlobalFeedMeta, type RecordLike } from "./pageHelpers.js";

const renderLayoutShell = renderLayout as (props: { title: string; body: string; scriptHrefs?: string[] }) => string;

export function renderGlobalFeedPageTsx(model: RecordLike) {
  const scriptHrefs: string[] = model.countryOptions?.length ? [FEED_COUNTRY_SELECT_SCRIPT_HREF] : [];
  return renderLayoutShell({
    title: model.pageTitle || "Feed",
    scriptHrefs,
    body: renderFeedLikePageBody(model, {
      emptyLabel: "No feed items available.",
      timelineEntryClass: "timeline-entry",
      paginationAriaLabel: "Feed pagination",
      renderHeaderIntro: (pageIntro) => `<p class="muted">${renderAboutHeaderLink()} <span>• ${escapeHtml(pageIntro)}</span></p>`,
      renderMeta: renderGlobalFeedMeta,
      renderExtraBody: () => "",
      renderPreList: renderCountryControls,
      resolveNavItems: (value) => [{ href: value.homeHref, label: "Hackerspaces" }, ...(value.streamNavItems || [{ href: "/feed/index.html", label: "News", isCurrent: true }])],
    }),
  });
}
