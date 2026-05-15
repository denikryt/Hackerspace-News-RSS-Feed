// Calendar time labels render on the server as a stable fallback, then the
// browser rewrites only timed events into the client's local timezone.
(function applyLocalCalendarTimes() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timeZone) {
    return;
  }

  const timeNodes = document.querySelectorAll("[data-calendar-local-time='true']");
  for (const timeNode of timeNodes) {
    const startInstant = timeNode.getAttribute("data-start-instant");
    if (!startInstant) {
      continue;
    }

    const endInstant = timeNode.getAttribute("data-end-instant");
    const localizedLabel = formatLocalTimeRange({ startInstant, endInstant, timeZone });
    if (!localizedLabel) {
      continue;
    }

    timeNode.textContent = localizedLabel;
  }
})();

function formatLocalTimeRange({ startInstant, endInstant, timeZone }) {
  const startDate = new Date(startInstant);
  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  const endDate = endInstant ? new Date(endInstant) : null;
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

function formatDateKey(value, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatShortDate(value, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(value);
}

function formatTime(value, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}
