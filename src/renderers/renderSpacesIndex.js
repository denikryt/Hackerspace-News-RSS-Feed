import { renderField, renderLayout, renderMetric, renderNav, renderStatus } from "./layout.js";

export function renderSpacesIndex(model) {
  const cards = model.cards
    .map(
      (card) => `<article class="card">
        <h3><a href="${card.detailHref}">${card.spaceName}</a></h3>
        <div class="meta">
          ${renderField("Country", card.country)}
          ${renderField("Wiki", card.sourceWikiUrl, true)}
          ${renderField("Feed", card.feedUrl, true)}
          ${renderField("Status", "", false)}
          ${renderStatus(card.status)}
        </div>
        ${
          card.latestItemTitle
            ? `<p><span class="field-label">Latest:</span> ${card.latestItemTitle}</p>`
            : `<p class="muted">No latest publication available.</p>`
        }
        ${card.latestItemDate ? `<p class="muted">${card.latestItemDate}</p>` : ""}
      </article>`,
    )
    .join("");

  return renderLayout({
    title: "Hackerspaces",
    body: `
      ${renderNav([
        { href: "/index.html", label: "Hackerspaces" },
        { href: "/feed/index.html", label: "Global Feed" },
      ])}
      <section class="panel">
        <h1>Hackerspaces</h1>
        <p class="muted">Source page: <a href="${model.sourcePageUrl}">${model.sourcePageUrl}</a></p>
        <div class="summary-grid">
          ${renderMetric("Source rows", model.summary.sourceRows)}
          ${renderMetric("Valid feeds", model.summary.validFeeds)}
          ${renderMetric("Parsed feeds", model.summary.parsedFeeds)}
          ${renderMetric("Empty feeds", model.summary.emptyFeeds)}
          ${renderMetric("Failed feeds", model.summary.failedFeeds)}
        </div>
      </section>
      <section class="panel">
        <h2>Spaces</h2>
        <div class="cards">${cards}</div>
      </section>
    `,
  });
}
