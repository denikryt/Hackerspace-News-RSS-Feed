import { readFile, readdir } from "node:fs/promises";

// Read every local ICS file and normalize only the fields the calendar page
// actually renders. Missing directories are treated as "no calendar data".
export async function readCalendarEvents({ directoryPath } = {}) {
  if (!directoryPath) {
    return [];
  }

  let directoryEntries;
  try {
    directoryEntries = await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const icsFiles = directoryEntries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".ics"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const parsedEventCollections = await Promise.all(
    icsFiles.map(async (fileName) => {
      const text = await readFile(`${directoryPath}/${fileName}`, "utf8");
      return parseCalendarIcsText(text, { sourceFile: fileName });
    }),
  );

  return parsedEventCollections
    .flat()
    .sort(compareCalendarEvents);
}

// ICS folding allows long logical lines to continue on the next physical line
// when the continuation starts with a space or tab.
function unfoldIcsLines(text) {
  const lines = String(text).replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const unfoldedLines = [];

  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && unfoldedLines.length > 0) {
      unfoldedLines[unfoldedLines.length - 1] += line.slice(1);
      continue;
    }
    unfoldedLines.push(line);
  }

  return unfoldedLines;
}

// Each VEVENT becomes one normalized event record with explicit date semantics
// so later layers can keep timed and all-day values separate.
export function parseCalendarIcsText(text, { sourceFile }) {
  const lines = unfoldIcsLines(text);
  const events = [];
  let currentLines = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      currentLines = [];
      continue;
    }

    if (line === "END:VEVENT") {
      if (currentLines) {
        events.push(toCalendarEvent(currentLines, { sourceFile }));
      }
      currentLines = null;
      continue;
    }

    if (currentLines) {
      currentLines.push(line);
    }
  }

  return events.filter(Boolean);
}

function toCalendarEvent(lines, { sourceFile }) {
  const event = {
    sourceFile,
    uid: "",
    summary: "",
    start: null,
    end: null,
    dateKind: "timed",
    allDay: false,
    hasTime: true,
    sourceTimeZone: null,
    startInstant: null,
    endInstant: null,
    sourceDate: null,
    location: null,
    description: null,
    url: null,
    categories: [],
    organizer: null,
  };

  for (const line of lines) {
    const property = parseIcsProperty(line);
    if (!property) {
      continue;
    }

    switch (property.name) {
      case "UID":
        event.uid = unescapeIcsText(property.value);
        break;
      case "SUMMARY":
        event.summary = unescapeIcsText(property.value);
        break;
      case "DTSTART":
        applyDateProperty(event, "start", property);
        break;
      case "DTEND":
        applyDateProperty(event, "end", property);
        break;
      case "DESCRIPTION":
        event.description = unescapeIcsText(property.value);
        break;
      case "LOCATION":
        event.location = unescapeIcsText(property.value);
        break;
      case "URL":
        event.url = unescapeIcsText(property.value);
        break;
      case "CATEGORIES":
        event.categories = splitEscapedList(property.value).map(unescapeIcsText).filter(Boolean);
        break;
      case "ORGANIZER":
        event.organizer = unescapeIcsText(property.value);
        break;
      default:
        break;
    }
  }

  if (!event.uid) {
    event.uid = `${sourceFile}:${event.summary || "event"}:${event.start || event.sourceDate || "unknown"}`;
  }

  if (!event.summary) {
    event.summary = "Untitled event";
  }

  return event.startInstant || event.sourceDate ? event : null;
}

function parseIcsProperty(line) {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex === -1) {
    return null;
  }

  const nameAndParams = line.slice(0, separatorIndex);
  const value = line.slice(separatorIndex + 1);
  const [rawName, ...rawParams] = nameAndParams.split(";");
  const params = Object.fromEntries(
    rawParams
      .map((chunk) => {
        const equalsIndex = chunk.indexOf("=");
        return equalsIndex === -1 ? null : [chunk.slice(0, equalsIndex).toUpperCase(), chunk.slice(equalsIndex + 1)];
      })
      .filter(Boolean),
  );

  return {
    name: rawName.toUpperCase(),
    params,
    value,
  };
}

// DTSTART and DTEND share the same wire format, so one helper keeps their
// timezone and date-kind rules consistent.
function applyDateProperty(event, fieldName, property) {
  const parsedDate = parseDateProperty(property.value, property.params);

  event[fieldName] = property.value;
  event.dateKind = parsedDate.dateKind;
  event.allDay = parsedDate.allDay;
  event.hasTime = parsedDate.hasTime;

  if (parsedDate.dateKind === "date") {
    event.sourceDate = parsedDate.sourceDate;
    event.sourceTimeZone = null;
    return;
  }

  event.sourceTimeZone = parsedDate.sourceTimeZone;
  if (fieldName === "start") {
    event.startInstant = parsedDate.instant;
  }
  if (fieldName === "end") {
    event.endInstant = parsedDate.instant;
  }
}

function parseDateProperty(value, params = {}) {
  if (params.VALUE === "DATE" || /^\d{8}$/.test(value)) {
    return {
      dateKind: "date",
      allDay: true,
      hasTime: false,
      sourceDate: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`,
      sourceTimeZone: null,
      instant: null,
    };
  }

  if (value.endsWith("Z")) {
    return {
      dateKind: "timed",
      allDay: false,
      hasTime: true,
      sourceTimeZone: "UTC",
      instant: toUtcInstant(value),
      sourceDate: null,
    };
  }

  const sourceTimeZone = params.TZID || "UTC";
  return {
    dateKind: "timed",
    allDay: false,
    hasTime: true,
    sourceTimeZone,
    instant: toZonedInstant(value, sourceTimeZone),
    sourceDate: null,
  };
}

function toUtcInstant(value) {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const hour = Number(value.slice(9, 11));
  const minute = Number(value.slice(11, 13));
  const second = Number(value.slice(13, 15) || "00");
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second)).toISOString();
}

// Zoned local wall-clock values need to be resolved into an absolute instant
// before the browser can safely reformat them for its own timezone.
function toZonedInstant(value, timeZone) {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const hour = Number(value.slice(9, 11));
  const minute = Number(value.slice(11, 13));
  const second = Number(value.slice(13, 15) || "00");
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const initialOffset = getTimeZoneOffsetMs(timeZone, new Date(utcGuess));
  let timestamp = utcGuess - initialOffset;
  const refinedOffset = getTimeZoneOffsetMs(timeZone, new Date(timestamp));

  if (refinedOffset !== initialOffset) {
    timestamp = utcGuess - refinedOffset;
  }

  return new Date(timestamp).toISOString();
}

function getTimeZoneOffsetMs(timeZone, date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const utcEquivalent = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return utcEquivalent - date.getTime();
}

// RFC5545 escaping uses backslash sequences for separators and line breaks.
function unescapeIcsText(value) {
  return String(value)
    .replaceAll("\\n", "\n")
    .replaceAll("\\N", "\n")
    .replaceAll("\\,", ",")
    .replaceAll("\\;", ";")
    .replaceAll("\\\\", "\\");
}

function splitEscapedList(value) {
  const parts = [];
  let current = "";
  let isEscaped = false;

  for (const char of String(value)) {
    if (isEscaped) {
      current += `\\${char}`;
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      isEscaped = true;
      continue;
    }

    if (char === ",") {
      parts.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  parts.push(current);
  return parts;
}

function compareCalendarEvents(left, right) {
  const leftSortKey = left.startInstant || `${left.sourceDate || ""}T00:00:00.000Z`;
  const rightSortKey = right.startInstant || `${right.sourceDate || ""}T00:00:00.000Z`;

  if (leftSortKey !== rightSortKey) {
    return leftSortKey.localeCompare(rightSortKey);
  }

  return (left.summary || "").localeCompare(right.summary || "");
}

export function sortCalendarEvents(events) {
  return [...(Array.isArray(events) ? events : [])].sort(compareCalendarEvents);
}
