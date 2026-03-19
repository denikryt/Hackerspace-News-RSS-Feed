import { renderDisplayContent } from "../contentDisplay.js";
import { escapeHtml, renderField, renderLayout, renderNav } from "./layout.js";

export function renderGlobalFeed(model) {
  const items = model.items
    .map(
      (item) => `<article class="item">
        <div class="item-inner">
        <h3>${escapeHtml(item.title || "Untitled item")}</h3>
        <div class="meta">
          ${renderField("Space", item.spaceName)}
          <span><span class="field-label">Space page:</span> <a href="${item.spaceHref}">${escapeHtml(item.spaceName)}</a></span>
          ${renderField("Date", item.publishedAt)}
          ${renderField("Original", item.link, true)}
        </div>
        ${renderDisplayContent(item)}
        </div>
      </article>`,
    )
    .join("");

  return renderLayout({
    title: "Global Feed",
    body: `
      ${renderNav([
        { href: model.homeHref, label: "Hackerspaces" },
        { href: "/feed/index.html", label: "Global Feed" },
      ])}
      <section class="panel panel-reading">
        <h1>Global Feed</h1>
        <p class="muted">All publications sorted from new to old.</p>
      </section>
      <section class="feed-list-shell">
        <div class="item-list">${items || `<p class="muted">No feed items available.</p>`}</div>
      </section>
    `,
  });
}
