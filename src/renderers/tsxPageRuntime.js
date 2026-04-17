import { tsImport } from "tsx/esm/api";

// Page-level TSX renderers load through one shared bridge so plain Node CLI
// entry points can keep importing stable `.js` wrappers.
const pageModule = await tsImport("../renderers-tsx/pages.tsx", import.meta.url);

export const {
  renderAboutPageTsx,
  renderAuthorDetailPageTsx,
  renderAuthorsIndexPageTsx,
  renderGlobalFeedPageTsx,
  renderNewspaperFeedPageTsx,
  renderSpaceDetailPageTsx,
  renderSpacesIndexPageTsx,
} = pageModule;
