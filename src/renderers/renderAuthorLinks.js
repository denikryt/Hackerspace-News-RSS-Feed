import { renderAuthorLinksTsx } from "./tsxSharedRuntime.js";

export function renderAuthorLinks(authorLinks, { linkClass = "", labelClass = "field-label" } = {}) {
  return renderAuthorLinksTsx(authorLinks, { linkClass, labelClass });
}
