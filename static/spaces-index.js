(() => {
  const spaceSearchInput = document.getElementById("space-search-input");
  const countryFilterSelect = document.getElementById("country-filter-select");
  const failedToggle = document.getElementById("show-failed-toggle");
  const sortModeSelect = document.getElementById("sort-mode-select");
  const cardsContainer = document.getElementById("spaces-cards");
  const emptyState = document.getElementById("spaces-empty-state");

  if (!spaceSearchInput || !countryFilterSelect || !failedToggle || !sortModeSelect || !cardsContainer || !emptyState) {
    return;
  }

  const cards = Array.from(cardsContainer.querySelectorAll(".card"));
  const storageKeys = {
    query: "hackerspace-news-feed.query",
    country: "hackerspace-news-feed.country",
    showFailed: "hackerspace-news-feed.showFailed",
    sortMode: "hackerspace-news-feed.sortMode",
  };

  const storedQuery = localStorage.getItem(storageKeys.query);
  const storedCountry = localStorage.getItem(storageKeys.country);
  const storedShowFailed = localStorage.getItem(storageKeys.showFailed);
  const storedSortMode = localStorage.getItem(storageKeys.sortMode);

  const defaultQuery = spaceSearchInput.value;
  const defaultCountry = countryFilterSelect.value;
  const lastUpdatedLabel = document.getElementById("last-updated-label");
  const availableCountries = new Set(["all", ...Array.from(countryFilterSelect.options).map((option) => option.value)]);

  spaceSearchInput.value = storedQuery === null ? defaultQuery : storedQuery;
  countryFilterSelect.value = availableCountries.has(storedCountry) ? storedCountry : defaultCountry;
  failedToggle.checked = storedShowFailed === null ? failedToggle.checked : storedShowFailed === "true";
  sortModeSelect.value = storedSortMode || sortModeSelect.value;

  function compareAlphabetical(left, right) {
    return left.dataset.spaceName.localeCompare(right.dataset.spaceName);
  }

  function compareLatest(left, right) {
    const leftValue = Date.parse(left.dataset.latestItemDate || "") || Number.NEGATIVE_INFINITY;
    const rightValue = Date.parse(right.dataset.latestItemDate || "") || Number.NEGATIVE_INFINITY;

    if (rightValue !== leftValue) {
      return rightValue - leftValue;
    }

    const leftCount = Number(left.dataset.publicationCount || "0");
    const rightCount = Number(right.dataset.publicationCount || "0");

    if (rightCount !== leftCount) {
      return rightCount - leftCount;
    }

    return compareAlphabetical(left, right);
  }

  function comparePublicationCount(left, right) {
    const leftCount = Number(left.dataset.publicationCount || "0");
    const rightCount = Number(right.dataset.publicationCount || "0");

    if (rightCount !== leftCount) {
      return rightCount - leftCount;
    }

    return compareLatest(left, right);
  }

  function formatLocalUpdatedAt(label) {
    if (!label) {
      return;
    }

    const rawValue = label.dataset.updatedAt;
    const parsed = rawValue ? new Date(rawValue) : null;

    if (!parsed || Number.isNaN(parsed.getTime())) {
      return;
    }

    const formatter = new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    label.textContent = formatter.format(parsed);
  }

  function applyUiState() {
    const spaceQuery = spaceSearchInput.value;
    const selectedCountry = countryFilterSelect.value;
    const showFailed = failedToggle.checked;
    const sortMode = sortModeSelect.value;

    localStorage.setItem(storageKeys.query, spaceQuery);
    localStorage.setItem(storageKeys.country, selectedCountry);
    localStorage.setItem(storageKeys.showFailed, String(showFailed));
    localStorage.setItem(storageKeys.sortMode, sortMode);

    const normalizedQuery = spaceQuery.trim().toLocaleLowerCase();
    let visibleCount = 0;

    cards.forEach((card) => {
      const matchesQuery = normalizedQuery
        ? (card.dataset.spaceName || "").toLocaleLowerCase().includes(normalizedQuery)
        : true;
      const matchesCountry = selectedCountry === "all" || card.dataset.country === selectedCountry;
      const isFailure = card.dataset.isFailure === "true";
      const isVisible = matchesQuery && matchesCountry && (showFailed || !isFailure);

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

  spaceSearchInput.addEventListener("input", applyUiState);
  countryFilterSelect.addEventListener("change", applyUiState);
  failedToggle.addEventListener("change", applyUiState);
  sortModeSelect.addEventListener("change", applyUiState);
  formatLocalUpdatedAt(lastUpdatedLabel);
  applyUiState();
})();
