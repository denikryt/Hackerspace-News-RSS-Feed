import { tsImport } from "tsx/esm/api";

// Plain Node CLI entry points stay on .js files, so we resolve the TSX module
// through tsx's scoped import bridge instead of changing the CLI runtime.
const sharedModule = await tsImport("../renderers-tsx/shared.tsx", import.meta.url);

export const {
  renderAuthorLinksTsx,
  renderPageHeaderTsx,
  renderPaginationTsx,
} = sharedModule;
