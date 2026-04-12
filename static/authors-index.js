(() => {
  const authorSearchInput = document.getElementById("author-search-input");
  const hackerspaceFilterSelect = document.getElementById("author-hackerspace-filter-select");
  const sortModeSelect = document.getElementById("author-sort-mode-select");
  const cardsContainer = document.getElementById("authors-cards");
  const emptyState = document.getElementById("authors-empty-state");

  if (!authorSearchInput || !hackerspaceFilterSelect || !sortModeSelect || !cardsContainer || !emptyState) {
    return;
  }

  const cards = Array.from(cardsContainer.querySelectorAll(".card"));
  const storageKeys = {
    query: "hackerspace-news-feed.authors.query",
    hackerspace: "hackerspace-news-feed.authors.hackerspace",
    sortMode: "hackerspace-news-feed.authors.sortMode",
  };

  const storedQuery = localStorage.getItem(storageKeys.query);
  const storedHackerspace = localStorage.getItem(storageKeys.hackerspace);
  const storedSortMode = localStorage.getItem(storageKeys.sortMode);
  const availableHackerspaces = new Set(["all", ...Array.from(hackerspaceFilterSelect.options).map((option) => option.value)]);
  const availableSortModes = new Set(Array.from(sortModeSelect.options).map((option) => option.value));

  authorSearchInput.value = storedQuery === null ? authorSearchInput.value : storedQuery;
  hackerspaceFilterSelect.value = availableHackerspaces.has(storedHackerspace)
    ? storedHackerspace
    : hackerspaceFilterSelect.value;
  sortModeSelect.value = availableSortModes.has(storedSortMode)
    ? storedSortMode
    : sortModeSelect.value;

  function compareAlphabetical(left, right) {
    return left.dataset.authorName.localeCompare(right.dataset.authorName);
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

  function applyUiState() {
    const authorQuery = authorSearchInput.value;
    const selectedHackerspace = hackerspaceFilterSelect.value;
    const sortMode = sortModeSelect.value;

    localStorage.setItem(storageKeys.query, authorQuery);
    localStorage.setItem(storageKeys.hackerspace, selectedHackerspace);
    localStorage.setItem(storageKeys.sortMode, sortMode);

    const normalizedQuery = authorQuery.trim().toLocaleLowerCase();
    let visibleCount = 0;

    cards.forEach((card) => {
      const cardHackerspaces = (card.dataset.hackerspaces || "").split("|").filter(Boolean);
      const matchesHackerspace = selectedHackerspace === "all" || cardHackerspaces.includes(selectedHackerspace);
      const matchesQuery = normalizedQuery
        ? (card.dataset.authorName || "").toLocaleLowerCase().includes(normalizedQuery)
        : true;
      const isVisible = matchesHackerspace && matchesQuery;

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

  authorSearchInput.addEventListener("input", applyUiState);
  hackerspaceFilterSelect.addEventListener("change", applyUiState);
  sortModeSelect.addEventListener("change", applyUiState);
  applyUiState();
})();
