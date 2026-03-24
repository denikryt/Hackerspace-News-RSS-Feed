import {
  escapeHtml,
  formatCompactDate,
  renderAboutHeaderLink,
  renderLayout,
  renderPageHeader,
} from "./layout.js";

export function renderAuthorsIndex(model) {
  const homeHref = model.homeHref || "/index.html";
  const feedHref = model.feedHref || "/feed/index.html";
  const authorsIndexHref = model.authorsIndexHref || "/authors/index.html";
  const hackerspaceOptions = [
    `<option value="all"${model.selectedHackerspace === "all" ? " selected" : ""}>All hackerspaces</option>`,
    ...(model.availableHackerspaces || []).map(
      (hackerspace) =>
        `<option value="${escapeHtml(hackerspace)}"${model.selectedHackerspace === hackerspace ? " selected" : ""}>${escapeHtml(hackerspace)}</option>`,
    ),
  ].join("");
  const cards = (model.authors || [])
    .map(
      (author) => `<article class="card"
        data-author-name="${escapeHtml(author.displayName)}"
        data-hackerspaces="${escapeHtml((author.hackerspaces || []).map((hackerspace) => hackerspace.name).join("|"))}"
        data-publication-count="${author.itemCount || 0}"
        data-latest-item-date="${escapeHtml(author.latestItemDate || "")}">
        <h3><a class="author-card-title" href="${author.detailHref}">${escapeHtml(author.displayName)}</a></h3>
        <div class="meta">
          <span>${escapeHtml(`${author.itemCount} publication${author.itemCount === 1 ? "" : "s"}`)}</span>
          ${author.latestItemDate ? `<span>${escapeHtml(formatCompactDate(author.latestItemDate))}</span>` : ""}
        </div>
        ${
          author.hackerspaces?.length
            ? `<p class="space-card-links">${author.hackerspaces
                .map(
                  (hackerspace) =>
                    `<a class="author-hackerspace-link" href="${escapeHtml(hackerspace.href)}">${escapeHtml(hackerspace.name)}</a>`,
                )
                .join("")}</p>`
            : ""
        }
      </article>`,
    )
    .join("");

  return renderLayout({
    title: "Authors",
    body: `
      <style>.author-card-title{color:var(--text);display:inline-block;max-inline-size:100%;overflow-wrap:anywhere;word-break:break-word;}.space-card-links .author-hackerspace-link{color:#111;}</style>
      ${renderPageHeader({
        title: "Authors",
        titleClass: "home-hero-title",
        headerClass: "page-header--wide page-header--compact",
        introHtml: `<p class="muted">${renderAboutHeaderLink()} <span>• All public authors detected from the dataset.</span></p>`,
        navItems: [
          { href: homeHref, label: "Hackerspaces" },
          { href: feedHref, label: "Feed" },
          { href: authorsIndexHref, label: "Authors", isCurrent: true },
        ],
        navClass: "page-nav--wide page-nav--compact",
      })}
      <section class="panel page-summary page-summary--home">
        <div class="meta">
          <label>
            Hackerspace
            <select id="author-hackerspace-filter-select" class="control-select control-select-country">
              ${hackerspaceOptions}
            </select>
          </label>
          <label>
            Sort authors
            <select id="author-sort-mode-select" class="control-select">
              <option value="alphabetical"${model.sortMode === "alphabetical" ? " selected" : ""}>Alphabetical</option>
              <option value="publication-count"${model.sortMode === "publication-count" ? " selected" : ""}>Publication count</option>
              <option value="latest-publication"${model.sortMode === "latest-publication" ? " selected" : ""}>Latest publication</option>
            </select>
          </label>
        </div>
        <div id="authors-cards" class="cards">${cards || `<p class="muted">No public authors available.</p>`}</div>
        <p id="authors-empty-state" class="muted"${(model.visibleAuthors || []).length === 0 ? "" : " hidden"}>No authors match the selected hackerspace.</p>
      </section>
      <script>
        const hackerspaceFilterSelect = document.getElementById("author-hackerspace-filter-select");
        const sortModeSelect = document.getElementById("author-sort-mode-select");
        const cardsContainer = document.getElementById("authors-cards");
        const emptyState = document.getElementById("authors-empty-state");
        const cards = Array.from(cardsContainer.querySelectorAll(".card"));
        const storageKeys = {
          hackerspace: "hackerspace-news-feed.authors.hackerspace",
          sortMode: "hackerspace-news-feed.authors.sortMode",
        };

        const storedHackerspace = localStorage.getItem(storageKeys.hackerspace);
        const storedSortMode = localStorage.getItem(storageKeys.sortMode);
        const availableHackerspaces = new Set(["all", ...Array.from(hackerspaceFilterSelect.options).map((option) => option.value)]);
        const availableSortModes = new Set(Array.from(sortModeSelect.options).map((option) => option.value));

        hackerspaceFilterSelect.value = availableHackerspaces.has(storedHackerspace)
          ? storedHackerspace
          : ${JSON.stringify(model.selectedHackerspace || "all")};
        sortModeSelect.value = availableSortModes.has(storedSortMode)
          ? storedSortMode
          : ${JSON.stringify(model.sortMode || "alphabetical")};

        function compareAlphabetical(left, right) {
          return left.dataset.authorName.localeCompare(right.dataset.authorName);
        }

        function comparePublicationCount(left, right) {
          const leftCount = Number(left.dataset.publicationCount || "0");
          const rightCount = Number(right.dataset.publicationCount || "0");
          if (rightCount !== leftCount) return rightCount - leftCount;
          return compareLatest(left, right);
        }

        function compareLatest(left, right) {
          const leftValue = Date.parse(left.dataset.latestItemDate || "") || Number.NEGATIVE_INFINITY;
          const rightValue = Date.parse(right.dataset.latestItemDate || "") || Number.NEGATIVE_INFINITY;
          if (rightValue !== leftValue) return rightValue - leftValue;

          const leftCount = Number(left.dataset.publicationCount || "0");
          const rightCount = Number(right.dataset.publicationCount || "0");
          if (rightCount !== leftCount) return rightCount - leftCount;

          return compareAlphabetical(left, right);
        }

        function applyUiState() {
          const selectedHackerspace = hackerspaceFilterSelect.value;
          const sortMode = sortModeSelect.value;

          localStorage.setItem(storageKeys.hackerspace, selectedHackerspace);
          localStorage.setItem(storageKeys.sortMode, sortMode);

          let visibleCount = 0;
          cards.forEach((card) => {
            const cardHackerspaces = (card.dataset.hackerspaces || "").split("|").filter(Boolean);
            const isVisible = selectedHackerspace === "all" || cardHackerspaces.includes(selectedHackerspace);
            card.style.display = isVisible ? "" : "none";
            if (isVisible) {
              visibleCount += 1;
            }
          });

          const comparator = sortMode === "publication-count"
            ? comparePublicationCount
            : sortMode === "latest-publication"
              ? compareLatest
              : compareAlphabetical;

          cards.sort(comparator).forEach((card) => cardsContainer.appendChild(card));
          emptyState.hidden = visibleCount !== 0;
        }

        hackerspaceFilterSelect.addEventListener("change", applyUiState);
        sortModeSelect.addEventListener("change", applyUiState);
        applyUiState();
      </script>
    `,
  });
}
