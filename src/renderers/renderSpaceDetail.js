import { escapeHtml, renderField, renderLayout, renderNav, renderStatus } from "./layout.js";

export function renderSpaceDetail(model) {
  const items = (model.items || [])
    .map(
      (item) => `<article class="item">
        <h3>${escapeHtml(item.title || "Untitled item")}</h3>
        <div class="meta">
          ${renderField("Date", item.publishedAt)}
          ${renderField("Author", item.author)}
          ${renderField("Original", item.link, true)}
        </div>
        ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}
        ${item.categories?.length ? `<p class="muted">${escapeHtml(item.categories.join(", "))}</p>` : ""}
      </article>`,
    )
    .join("");

  return renderLayout({
    title: model.spaceName,
    body: `
      ${renderNav([
        { href: model.homeHref, label: "Hackerspaces" },
        { href: model.globalFeedHref, label: "Global Feed" },
      ])}
      <section class="panel">
        <h1>${escapeHtml(model.spaceName)}</h1>
        <div class="meta">
          ${renderField("Country", model.country)}
          ${renderField("Wiki", model.sourceWikiUrl, true)}
          ${renderField("Site", model.siteUrl, true)}
          ${renderField("Feed", model.feedUrl, true)}
          ${renderField("Feed type", model.feedType)}
          ${renderStatus(model.status)}
        </div>
        ${model.errorCode ? `<p><span class="field-label">Error:</span> ${escapeHtml(model.errorCode)}</p>` : ""}
      </section>
      <section class="panel">
        <h2>Publications</h2>
        <div class="item-list">${items || `<p class="muted">No publications available.</p>`}</div>
      </section>
    `,
  });
}
