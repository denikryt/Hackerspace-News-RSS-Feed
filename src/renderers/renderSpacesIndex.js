import {
  escapeHtml,
  formatCompactDate,
  renderField,
  renderLayout,
  renderMetric,
  renderNav,
} from "./layout.js";

export function renderSpacesIndex(model) {
  const countryOptions = [
    `<option value="all"${model.selectedCountry === "all" ? " selected" : ""}>All countries</option>`,
    ...(model.availableCountries || []).map(
      (country) =>
        `<option value="${escapeHtml(country)}"${model.selectedCountry === country ? " selected" : ""}>${escapeHtml(country)}</option>`,
    ),
  ].join("");

  const cards = model.cards
    .map(
      (card) => `<article class="card"
        data-space-name="${escapeHtml(card.spaceName)}"
        data-country="${escapeHtml(card.country || "")}"
        data-is-failure="${card.isFailure ? "true" : "false"}"
        data-default-visible="${card.isVisibleByDefault ? "true" : "false"}"
        data-latest-item-date="${escapeHtml(card.latestItemDate || "")}">
        <h3><a class="space-card-title" href="${card.detailHref}">${card.spaceName}</a></h3>
        <div class="meta">
          ${renderField("Country", card.country)}
        </div>
        <p class="space-card-links">
          ${card.sourceWikiUrl ? `<a href="${card.sourceWikiUrl}">Wiki</a>` : ""}
          ${card.siteUrl ? `<a href="${card.siteUrl}">Website</a>` : ""}
        </p>
        ${
          card.latestItemTitle
            ? `<p><span class="field-label">Latest:</span> ${
                card.latestItemLink
                  ? `<a class="space-card-latest-link" href="${card.latestItemLink}">${escapeHtml(card.latestItemTitle)}</a>`
                  : escapeHtml(card.latestItemTitle)
              }</p>`
            : `<p class="muted">No latest publication available.</p>`
        }
        ${card.latestItemDate ? `<p class="space-card-date muted">${escapeHtml(formatCompactDate(card.latestItemDate))}</p>` : ""}
      </article>`,
    )
    .join("");

  return renderLayout({
    title: "Hackerspace News",
    body: `
      <section class="panel">
        <h1 class="home-hero-title">Hackerspace News</h1>
        <p class="muted"><a class="about-link-muted" href="/about/index.html">About</a></p>
        <div class="summary-grid home-summary-grid">
          ${renderMetric("Total spaces", model.summary.sourceRows)}
          ${renderMetric("Readable feeds", model.summary.parsedFeeds)}
        </div>
      </section>
      <div class="home-nav">
        ${renderNav([
          { href: "/index.html", label: "Hackerspaces", isCurrent: true },
          { href: "/feed/index.html", label: "Global Feed" },
        ])}
      </div>
      <section class="panel">
        <div class="meta">
          <label>
            Country
            <select id="country-filter-select" class="control-select control-select-country">
              ${countryOptions}
            </select>
          </label>
          <label>
            Sort cards
            <select id="sort-mode-select" class="control-select">
              <option value="alphabetical"${model.sortMode === "alphabetical" ? " selected" : ""}>Alphabetical</option>
              <option value="latest-publication"${model.sortMode === "latest-publication" ? " selected" : ""}>Latest publication</option>
            </select>
          </label>
          <label>
            <input id="show-failed-toggle" type="checkbox" />
            Show failed feeds
          </label>
        </div>
        <div id="spaces-cards" class="cards">${cards}</div>
        <p id="spaces-empty-state" class="muted" hidden>No hackerspaces match the selected country.</p>
      </section>
      <script>
        const countryFilterSelect = document.getElementById("country-filter-select");
        const failedToggle = document.getElementById("show-failed-toggle");
        const sortModeSelect = document.getElementById("sort-mode-select");
        const cardsContainer = document.getElementById("spaces-cards");
        const emptyState = document.getElementById("spaces-empty-state");
        const cards = Array.from(cardsContainer.querySelectorAll(".card"));
        const storageKeys = {
          country: "hackerspace-news-feed.country",
          showFailed: "hackerspace-news-feed.showFailed",
          sortMode: "hackerspace-news-feed.sortMode",
        };

        const storedCountry = localStorage.getItem(storageKeys.country);
        const storedShowFailed = localStorage.getItem(storageKeys.showFailed);
        const storedSortMode = localStorage.getItem(storageKeys.sortMode);

        const defaultCountry = ${JSON.stringify(model.selectedCountry)};
        const availableCountries = new Set(["all", ...Array.from(countryFilterSelect.options).map((option) => option.value)]);

        countryFilterSelect.value = availableCountries.has(storedCountry) ? storedCountry : defaultCountry;
        failedToggle.checked = storedShowFailed === null ? ${model.showFailed ? "true" : "false"} : storedShowFailed === "true";
        sortModeSelect.value = storedSortMode || ${JSON.stringify(model.sortMode)};

        function compareAlphabetical(left, right) {
          return left.dataset.spaceName.localeCompare(right.dataset.spaceName);
        }

        function compareLatest(left, right) {
          const leftValue = Date.parse(left.dataset.latestItemDate || "") || Number.NEGATIVE_INFINITY;
          const rightValue = Date.parse(right.dataset.latestItemDate || "") || Number.NEGATIVE_INFINITY;
          if (rightValue !== leftValue) return rightValue - leftValue;
          return compareAlphabetical(left, right);
        }

        function applyUiState() {
          const selectedCountry = countryFilterSelect.value;
          const showFailed = failedToggle.checked;
          const sortMode = sortModeSelect.value;

          localStorage.setItem(storageKeys.country, selectedCountry);
          localStorage.setItem(storageKeys.showFailed, String(showFailed));
          localStorage.setItem(storageKeys.sortMode, sortMode);

          let visibleCount = 0;
          cards.forEach((card) => {
            const matchesCountry = selectedCountry === "all" || card.dataset.country === selectedCountry;
            const isFailure = card.dataset.isFailure === "true";
            const isVisible = matchesCountry && (showFailed || !isFailure);
            card.style.display = isVisible ? "" : "none";
            if (isVisible) {
              visibleCount += 1;
            }
          });

          const comparator = sortMode === "latest-publication" ? compareLatest : compareAlphabetical;
          cards.sort(comparator).forEach((card) => cardsContainer.appendChild(card));
          emptyState.hidden = visibleCount !== 0;
        }

        countryFilterSelect.addEventListener("change", applyUiState);
        failedToggle.addEventListener("change", applyUiState);
        sortModeSelect.addEventListener("change", applyUiState);
        applyUiState();
      </script>
    `,
  });
}
