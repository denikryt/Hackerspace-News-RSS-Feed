const DAY_MS = 86_400_000;
const FILTER_STORAGE_KEYS = {
  country: "hackerspace-news-feed.calendar.country",
  hackerspace: "hackerspace-news-feed.calendar.hackerspace",
};

// Calendar pages ship with rendered HTML fallback for crawlers and no-JS
// clients. When JavaScript is available, the browser rebuilds the visible
// month in the client timezone and applies interactive filters on top.
if (typeof document !== "undefined") {
  enhanceCalendarPage().catch(() => {});
}

async function enhanceCalendarPage() {
  const shell = document.querySelector(".calendar-shell");
  if (!shell) {
    return;
  }

  const controls = resolveCalendarControls(shell);
  if (!controls) {
    return;
  }

  const eventsPath = shell.getAttribute("data-calendar-events-path");
  const fallbackMonth = shell.getAttribute("data-calendar-fallback-month");
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!eventsPath || !timeZone) {
    return;
  }

  const payload = await loadCalendarPayload(eventsPath);
  if (!payload) {
    return;
  }

  const events = Array.isArray(payload.events) ? payload.events : [];
  const filterOptions = buildFilterOptions(events);
  populateFilterSelect({
    select: controls.countrySelect,
    defaultLabel: "All countries",
    options: filterOptions.availableCountries,
  });
  populateFilterSelect({
    select: controls.hackerspaceSelect,
    defaultLabel: "All hackerspaces",
    options: filterOptions.availableHackerspaces,
  });

  const storedSelection = loadStoredFilterSelection({
    storage: window.localStorage,
    filterOptions,
  });
  controls.countrySelect.value = storedSelection.selectedCountry;
  controls.hackerspaceSelect.value = storedSelection.selectedHackerspace;

  const selectedMonth = resolveSelectedMonth({
    pathname: window.location.pathname,
    fallbackMonth,
    timeZone,
    now: new Date(),
  });

  const renderCurrentView = () => {
    const filterSelection = normalizeFilterSelection({
      selectedCountry: controls.countrySelect.value,
      selectedHackerspace: controls.hackerspaceSelect.value,
      filterOptions,
    });
    controls.countrySelect.value = filterSelection.selectedCountry;
    controls.hackerspaceSelect.value = filterSelection.selectedHackerspace;
    persistFilterSelection({
      storage: window.localStorage,
      filterSelection,
    });

    const model = buildClientCalendarModel({
      events,
      selectedMonth,
      timeZone,
      now: new Date(),
      selectedCountry: filterSelection.selectedCountry,
      selectedHackerspace: filterSelection.selectedHackerspace,
    });

    renderCalendarShell({
      controls,
      model,
    });
  };

  controls.countrySelect.addEventListener("change", renderCurrentView);
  controls.hackerspaceSelect.addEventListener("change", renderCurrentView);
  renderCurrentView();
}

function resolveCalendarControls(shell) {
  const countrySelect = shell.querySelector("[data-calendar-country-filter]");
  const hackerspaceSelect = shell.querySelector("[data-calendar-hackerspace-filter]");
  const monthSwitcher = shell.querySelector("[data-calendar-month-switcher]");
  const columns = shell.querySelector("[data-calendar-columns]");
  const emptyState = shell.querySelector("#calendar-filter-empty-state");

  if (!countrySelect || !hackerspaceSelect || !monthSwitcher || !columns || !emptyState) {
    return null;
  }

  return {
    shell,
    countrySelect,
    hackerspaceSelect,
    monthSwitcher,
    columns,
    emptyState,
  };
}

async function loadCalendarPayload(eventsPath) {
  try {
    const response = await fetch(eventsPath);
    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

// Filter options come from curated event metadata, not from month-local
// derived columns, so they stay stable when the user switches months.
function buildFilterOptions(events) {
  const countries = new Set();
  const hackerspaces = new Set();

  for (const event of Array.isArray(events) ? events : []) {
    if (typeof event?.country === "string" && event.country.trim() !== "") {
      countries.add(event.country.trim());
    }

    if (typeof event?.hackerspaceName === "string" && event.hackerspaceName.trim() !== "") {
      hackerspaces.add(event.hackerspaceName.trim());
    }
  }

  return {
    availableCountries: [...countries].sort((left, right) => left.localeCompare(right)),
    availableHackerspaces: [...hackerspaces].sort((left, right) => left.localeCompare(right)),
  };
}

function populateFilterSelect({ select, defaultLabel, options }) {
  const previousValue = select.value;
  const optionHtml = [
    `<option value="all">${escapeHtml(defaultLabel)}</option>`,
    ...options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`),
  ].join("");

  select.innerHTML = optionHtml;
  select.value = optionValueExists(options, previousValue) ? previousValue : "all";
}

function loadStoredFilterSelection({ storage, filterOptions }) {
  return normalizeFilterSelection({
    selectedCountry: readStorageValue(storage, FILTER_STORAGE_KEYS.country),
    selectedHackerspace: readStorageValue(storage, FILTER_STORAGE_KEYS.hackerspace),
    filterOptions,
  });
}

function persistFilterSelection({ storage, filterSelection }) {
  writeStorageValue(storage, FILTER_STORAGE_KEYS.country, filterSelection.selectedCountry);
  writeStorageValue(storage, FILTER_STORAGE_KEYS.hackerspace, filterSelection.selectedHackerspace);
}

function normalizeFilterSelection({
  selectedCountry,
  selectedHackerspace,
  filterOptions,
}) {
  return {
    selectedCountry: normalizeFilterValue(selectedCountry, filterOptions.availableCountries),
    selectedHackerspace: normalizeFilterValue(selectedHackerspace, filterOptions.availableHackerspaces),
  };
}

function normalizeFilterValue(value, options) {
  return optionValueExists(options, value) ? value : "all";
}

function optionValueExists(options, value) {
  return value === "all" || (typeof value === "string" && options.includes(value));
}

function readStorageValue(storage, key) {
  try {
    return storage?.getItem(key) || "all";
  } catch {
    return "all";
  }
}

function writeStorageValue(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Ignore storage failures and keep the page interactive.
  }
}

// Timed events regroup by the client's timezone, while date-only events stay
// pinned to their source day to avoid accidental day drift.
function buildClientCalendarModel({
  events,
  selectedMonth,
  timeZone,
  now,
  selectedCountry = "all",
  selectedHackerspace = "all",
}) {
  const filterOptions = buildFilterOptions(events);
  const filterSelection = normalizeFilterSelection({
    selectedCountry,
    selectedHackerspace,
    filterOptions,
  });
  const filteredEvents = filterCalendarEvents(events, filterSelection);
  const eventIndex = buildEventIndex(filteredEvents, timeZone);
  const availableDates = [...eventIndex.keys()].sort((left, right) => left.localeCompare(right));
  const availableMonthsWithEvents = [...new Set(availableDates.map((dateKey) => dateKey.slice(0, 7)))];
  const currentMonth = formatMonthKey(now, timeZone);
  const monthNavigation = resolveMonthNavigation(availableMonthsWithEvents, selectedMonth);

  return {
    selectedMonth,
    selectedMonthLabel: formatMonthLabel(selectedMonth),
    currentMonth,
    previousMonth: monthNavigation.previousMonth,
    nextMonth: monthNavigation.nextMonth,
    availableCountries: filterOptions.availableCountries,
    availableHackerspaces: filterOptions.availableHackerspaces,
    selectedCountry: filterSelection.selectedCountry,
    selectedHackerspace: filterSelection.selectedHackerspace,
    dateSections: buildDateSections({ monthKey: selectedMonth, eventIndex, timeZone }),
  };
}

function filterCalendarEvents(events, filterSelection) {
  return (Array.isArray(events) ? events : []).filter((event) => {
    const matchesCountry = filterSelection.selectedCountry === "all"
      || event?.country === filterSelection.selectedCountry;
    const matchesHackerspace = filterSelection.selectedHackerspace === "all"
      || event?.hackerspaceName === filterSelection.selectedHackerspace;

    return matchesCountry && matchesHackerspace;
  });
}

function renderCalendarShell({ controls, model }) {
  controls.monthSwitcher.innerHTML = renderMonthSwitcher(model);

  if (!model.dateSections.length) {
    controls.columns.innerHTML = "";
    controls.emptyState.hidden = false;
    return;
  }

  controls.columns.innerHTML = renderDateSections(model.dateSections);
  controls.emptyState.hidden = true;
}

function renderMonthSwitcher(model) {
  return `<div class="calendar-month-switcher-side calendar-month-switcher-side--left">
        ${renderMonthNavLink(model.previousMonth, model.currentMonth)}
      </div>
      <h2 class="calendar-month-current">${escapeHtml(model.selectedMonthLabel)}</h2>
      <div class="calendar-month-switcher-side calendar-month-switcher-side--right">
        ${renderMonthNavLink(model.nextMonth, model.currentMonth)}
      </div>`;
}

function renderMonthNavLink(monthKey, currentMonth) {
  if (!monthKey) {
    return "";
  }

  const href = monthKey === currentMonth ? "/calendar/" : `/calendar/${monthKey}/`;
  return `<a class="calendar-month-link" href="${escapeHtml(href)}">${escapeHtml(formatMonthLabel(monthKey))}</a>`;
}

function renderDateSections(sections) {
  return sections.map((section) => `<section class="calendar-date-column">
      <h3 class="calendar-date-band">${renderDateBandLabel(section.dateLabel)}</h3>
      <div class="calendar-date-events">
        ${renderDayEvents(section.events)}
      </div>
    </section>`).join("");
}

function renderDateBandLabel(label) {
  const [weekday, rest] = String(label).split("/", 2);
  if (!rest) {
    return escapeHtml(label);
  }

  return `<span class="calendar-date-band-weekday">${escapeHtml(weekday)}/</span><span class="calendar-date-band-date">${escapeHtml(rest)}</span>`;
}

function renderDayEvents(events) {
  return events.map((event) => {
    const metaBits = [
      event.timeLabel ? `<span class="calendar-event-time">${escapeHtml(event.timeLabel)}</span>` : "",
    ].filter(Boolean).join("");
    const sourceMeta = renderEventSourceMeta(event);

    const description = event.description
      ? `<p class="calendar-event-description">${escapeHtml(event.description).replaceAll("\n", "<br />")}</p>`
      : "";

    const heading = event.url
      ? `<h4 class="calendar-event-title"><a href="${escapeHtml(event.url)}">${escapeHtml(event.summary || "Untitled event")}</a></h4>`
      : `<h4 class="calendar-event-title">${escapeHtml(event.summary || "Untitled event")}</h4>`;

    return `<article class="calendar-event">
      ${heading}
      ${metaBits ? `<div class="calendar-event-meta">${metaBits}</div>` : ""}
      ${sourceMeta}
      ${description}
    </article>`;
  }).join("");
}

function renderEventSourceMeta(event) {
  const flagHtml = event.countryFlag && event.countryName
    ? `<span title="${escapeHtml(event.countryName)}">${event.countryFlag}</span>`
    : (event.countryFlag || "");
  const parts = [
    flagHtml,
    event.hackerspaceName ? escapeHtml(event.hackerspaceName) : "",
  ].filter(Boolean);

  if (!parts.length) {
    return "";
  }

  return `<p class="calendar-event-source">${parts.join(" · ")}</p>`;
}

function buildDateSections({ monthKey, eventIndex, timeZone }) {
  return [...eventIndex.entries()]
    .filter(([dateKey]) => dateKey.startsWith(`${monthKey}-`))
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([dateKey, entries]) => ({
      date: dateKey,
      dateLabel: formatDateBandLabel(dateKey, timeZone),
      events: entries.map((entry) => toVisibleDayEvent(entry.event, timeZone)),
    }));
}

function buildEventIndex(events, timeZone) {
  const index = new Map();

  for (const event of events) {
    const visibleDates = listVisibleDatesForEvent(event, timeZone);
    for (const visibleDate of visibleDates) {
      if (!index.has(visibleDate)) {
        index.set(visibleDate, []);
      }
      index.get(visibleDate).push({ visibleDate, event });
    }
  }

  for (const entries of index.values()) {
    entries.sort(compareIndexedEvents);
  }

  return index;
}

function listVisibleDatesForEvent(event, timeZone) {
  if (!event) {
    return [];
  }

  if (event.dateKind === "date") {
    return event.sourceDate ? [event.sourceDate] : [];
  }

  if (!event.startInstant) {
    return [];
  }

  const startDateKey = formatDateKey(new Date(event.startInstant), timeZone);
  const endDateKey = formatDateKey(new Date(event.endInstant || event.startInstant), timeZone);
  return listDateKeysBetween(startDateKey, endDateKey);
}

function listDateKeysBetween(startDateKey, endDateKey) {
  const dates = [];
  const start = new Date(`${startDateKey}T00:00:00.000Z`);
  const end = new Date(`${endDateKey}T00:00:00.000Z`);

  for (let current = start.getTime(); current <= end.getTime(); current += DAY_MS) {
    dates.push(new Date(current).toISOString().slice(0, 10));
  }

  return dates;
}

function toVisibleDayEvent(event, timeZone) {
  return {
    summary: event.summary || "Untitled event",
    timeLabel: formatEventTimeLabel(event, timeZone),
    countryName: event.country || null,
    countryFlag: event.countryFlag || null,
    hackerspaceName: event.hackerspaceName || null,
    description: event.description || null,
    url: event.url || null,
  };
}

function formatEventTimeLabel(event, timeZone) {
  if (!event || event.dateKind === "date" || !event.startInstant) {
    return "All day";
  }

  const startDate = new Date(event.startInstant);
  const endDate = event.endInstant ? new Date(event.endInstant) : null;
  const startDateKey = formatDateKey(startDate, timeZone);
  const endDateKey = endDate ? formatDateKey(endDate, timeZone) : startDateKey;
  const startTime = formatTime(startDate, timeZone);

  if (!endDate || Number.isNaN(endDate.getTime())) {
    return startTime;
  }

  const endTime = formatTime(endDate, timeZone);
  if (startDateKey === endDateKey) {
    return `${startTime} - ${endTime}`;
  }

  return `${formatShortDate(startDate, timeZone)} ${startTime} - ${formatShortDate(endDate, timeZone)} ${endTime}`;
}

function compareIndexedEvents(left, right) {
  const leftSortKey = left.event.startInstant || `${left.event.sourceDate || ""}T00:00:00.000Z`;
  const rightSortKey = right.event.startInstant || `${right.event.sourceDate || ""}T00:00:00.000Z`;

  if (leftSortKey !== rightSortKey) {
    return leftSortKey.localeCompare(rightSortKey);
  }

  return (left.event.summary || "").localeCompare(right.event.summary || "");
}

function resolveMonthNavigation(availableMonthsWithEvents, selectedMonth) {
  const previousMonth = [...availableMonthsWithEvents]
    .reverse()
    .find((monthKey) => monthKey < selectedMonth) || null;
  const nextMonth = availableMonthsWithEvents.find((monthKey) => monthKey > selectedMonth) || null;

  return {
    previousMonth,
    nextMonth,
  };
}

function resolveSelectedMonth({ pathname, fallbackMonth, timeZone, now }) {
  const monthMatch = pathname.match(/^\/calendar\/(\d{4}-\d{2})\/?$/);
  if (monthMatch) {
    return monthMatch[1];
  }

  if (pathname === "/calendar" || pathname === "/calendar/") {
    return formatMonthKey(now, timeZone);
  }

  return fallbackMonth || formatMonthKey(now, timeZone);
}

function formatMonthKey(value, timeZone) {
  return formatDateKey(value, timeZone).slice(0, 7);
}

function formatDateKey(value, timeZone) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatMonthLabel(monthKey) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${monthKey}-01T00:00:00.000Z`));
}

function formatTime(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatShortDate(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateBandLabel(dateKey, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).formatToParts(new Date(`${dateKey}T00:00:00.000Z`));

  const weekday = parts.find((part) => part.type === "weekday")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  return `${weekday}/${month} ${day}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
