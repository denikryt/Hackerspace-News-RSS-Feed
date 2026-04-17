import { buildDisplayContent } from "../contentDisplay.js";
import { getAuthorsIndexHref } from "../authors.js";
import { buildAuthorDirectory, withAuthorLinks } from "./authors.js";

export function buildCuratedIndexModel(normalizedPayload) {
  const authorDirectory = buildAuthorDirectory(normalizedPayload);
  const items = (normalizedPayload.curated?.items || []).map((item) =>
    withAuthorLinks({ ...item, displayContent: buildDisplayContent(item) }, authorDirectory),
  );

  return {
    pageTitle: "Curated",
    pageIntro: "Manually selected publications.",
    items,
    currentPageLabel: "Page 1 of 1",
    publicationCountLabel: `${items.length} publication${items.length === 1 ? "" : "s"}`,
    streamNavItems: [
      { href: "/news/index.html", label: "News", isCurrent: false },
      { href: "/curated/index.html", label: "Curated", isCurrent: true },
      { href: getAuthorsIndexHref(), label: "Authors", isCurrent: false },
    ],
    homeHref: "/index.html",
  };
}
