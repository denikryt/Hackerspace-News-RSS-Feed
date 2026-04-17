(function () {
  var controls = document.querySelector(".feed-controls-np");
  if (!controls) return;

  var base = controls.getAttribute("data-date-href-base") || "";
  var currentDate = controls.getAttribute("data-current-date") || "";
  var selectedCountry = controls.getAttribute("data-selected-country") || "";
  var select = controls.querySelector(".np-date-select");
  if (!select) return;

  fetch("/feed/dates.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var dates = selectedCountry ? (data.byCountry[selectedCountry] || []) : data.dates;
      var frag = document.createDocumentFragment();
      dates.forEach(function (date) {
        var opt = document.createElement("option");
        opt.value = base + date + "/";
        opt.textContent = formatDate(date);
        if (date === currentDate) opt.selected = true;
        frag.appendChild(opt);
      });
      select.appendChild(frag);
      select.onchange = function () { location.href = select.value; };
    })
    .catch(function () {});

  function formatDate(dateStr) {
    var parts = dateStr.split("-");
    var d = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
    return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  }
})();
