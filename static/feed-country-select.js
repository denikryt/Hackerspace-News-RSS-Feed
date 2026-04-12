(() => {
  const feedCountrySelect = document.getElementById("feed-country-select");

  if (!feedCountrySelect) {
    return;
  }

  feedCountrySelect.addEventListener("change", () => {
    if (feedCountrySelect.value) {
      window.location.href = feedCountrySelect.value;
    }
  });
})();
