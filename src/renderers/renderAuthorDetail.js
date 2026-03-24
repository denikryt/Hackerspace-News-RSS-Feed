import { renderGlobalFeed } from "./renderGlobalFeed.js";

export function renderAuthorDetail(model) {
  const sourceLabel = (model.authorSources || []).length
    ? `Observed via ${model.authorSources.join(", ")}.`
    : "Author extracted from the dataset.";
  const derivedTotalPages =
    model.totalPages || Math.max(1, (model.pageLinks || []).filter((link) => link.type === "page").length);
  const derivedCurrentPage =
    model.currentPage || model.pageLinks?.find((link) => link.type === "page" && link.isCurrent)?.page || 1;

  return renderGlobalFeed({
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
