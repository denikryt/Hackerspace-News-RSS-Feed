import { escapeHtml } from "./layout.js";

export function renderAuthorLinks(authorLinks, { linkClass = "", labelClass = "field-label" } = {}) {
  if (!authorLinks?.length) {
    return "";
  }

  const label = authorLinks.length === 1 ? "Author" : "Authors";
  const links = authorLinks
    .map(
      (author) =>
        `<a class="${escapeHtml(linkClass)}" href="${escapeHtml(author.href)}">${escapeHtml(author.label)}</a>`,
    )
    .join(", ");

  return `<span><span class="${escapeHtml(labelClass)}">${label}:</span> ${links}</span>`;
}
