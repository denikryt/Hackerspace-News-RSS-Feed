import { readJson } from "./storage.js";

// Calendar source analysis reads the curated source list, fetches each ICS
// payload, and inventories the raw VEVENT fields that actually occur across
// sources. This is an analysis tool, not part of refresh or render.
export async function analyzeCalendarSources({
  calendarSourcesPath,
  fetchImpl = fetch,
  readJsonImpl = readJson,
  logger = null,
} = {}) {
  const sourceItems = await loadCalendarSourceItems({ calendarSourcesPath, readJsonImpl });
  const sourceResults = [];
  const totalPropertyCounts = new Map();
  const totalTimeZones = new Map();
  const dtstartEncodings = {
    utc: 0,
    zoned: 0,
    date: 0,
    floating: 0,
  };

  for (const sourceItem of sourceItems) {
    logInfo(logger, `[analyze] probing calendar source: ${sourceItem.url}`);
    const result = await analyzeCalendarSource(sourceItem, { fetchImpl });
    sourceResults.push(result);

    if (result.status !== "parsed_ok") {
      continue;
    }

    mergeCountMaps(totalPropertyCounts, result.propertyCounts);
    mergeCountMaps(totalTimeZones, result.timeZones);
    dtstartEncodings.utc += result.dtstartEncodings.utc;
    dtstartEncodings.zoned += result.dtstartEncodings.zoned;
    dtstartEncodings.date += result.dtstartEncodings.date;
    dtstartEncodings.floating += result.dtstartEncodings.floating;
  }

  const totalEvents = sourceResults.reduce((sum, result) => sum + (result.totalEvents || 0), 0);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalSources: sourceItems.length,
      parsedSources: sourceResults.filter((result) => result.status === "parsed_ok").length,
      failedSources: sourceResults.filter((result) => result.status !== "parsed_ok").length,
      totalEvents,
    },
    propertyPresence: toSortedCountList(totalPropertyCounts),
    dtstartEncodings,
    timeZones: toSortedCountList(totalTimeZones),
    sourceResults,
  };
}

// This helper keeps the raw ICS inventory deterministic so unit tests can
// document the exact field patterns the broader analyzer builds on.
export function analyzeCalendarIcsText(text) {
  const lines = unfoldIcsLines(text);
  const propertyCounts = new Map();
  const timeZones = new Map();
  const dtstartEncodings = {
    utc: 0,
    zoned: 0,
    date: 0,
    floating: 0,
  };
  let currentEventLines = null;
  let totalEvents = 0;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      currentEventLines = [];
      continue;
    }

    if (line === "END:VEVENT") {
      if (currentEventLines) {
        totalEvents += 1;
        analyzeEventLines(currentEventLines, { propertyCounts, dtstartEncodings, timeZones });
      }
      currentEventLines = null;
      continue;
    }

    if (currentEventLines) {
      currentEventLines.push(line);
    }
  }

  return {
    totalEvents,
    propertyCounts: Object.fromEntries(propertyCounts),
    dtstartEncodings,
    timeZones: Object.fromEntries(timeZones),
  };
}

async function analyzeCalendarSource(sourceItem, { fetchImpl }) {
  try {
    const response = await fetchImpl(sourceItem.url);
    const body = await response.text();

    if (!isCalendarResponse({
      url: response.url || sourceItem.url,
      contentType: response.headers.get("content-type"),
      body,
    })) {
      return {
        url: sourceItem.url,
        hackerspaceName: sourceItem.hs_name || "",
        country: sourceItem.country || "",
        status: "non_calendar_response",
        totalEvents: 0,
        propertyCounts: {},
        dtstartEncodings: { utc: 0, zoned: 0, date: 0, floating: 0 },
        timeZones: {},
      };
    }

    const report = analyzeCalendarIcsText(body);
    return {
      url: sourceItem.url,
      hackerspaceName: sourceItem.hs_name || "",
      country: sourceItem.country || "",
      status: "parsed_ok",
      ...report,
    };
  } catch (error) {
    return {
      url: sourceItem.url,
      hackerspaceName: sourceItem.hs_name || "",
      country: sourceItem.country || "",
      status: "fetch_failed",
      errorMessage: error instanceof Error ? error.message : String(error),
      totalEvents: 0,
      propertyCounts: {},
      dtstartEncodings: { utc: 0, zoned: 0, date: 0, floating: 0 },
      timeZones: {},
    };
  }
}

async function loadCalendarSourceItems({ calendarSourcesPath, readJsonImpl }) {
  const payload = await readJsonImpl(calendarSourcesPath);
  return Array.isArray(payload?.items) ? payload.items : [];
}

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

function analyzeEventLines(lines, { propertyCounts, dtstartEncodings, timeZones }) {
  for (const line of lines) {
    const property = parseIcsProperty(line);
    if (!property) {
      continue;
    }

    propertyCounts.set(property.name, (propertyCounts.get(property.name) || 0) + 1);

    if (property.name === "DTSTART") {
      const encoding = classifyDateEncoding(property.value, property.params);
      dtstartEncodings[encoding] += 1;

      if (encoding === "zoned" && property.params.TZID) {
        timeZones.set(property.params.TZID, (timeZones.get(property.params.TZID) || 0) + 1);
      }
    }
  }
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

function classifyDateEncoding(value, params = {}) {
  if (params.VALUE === "DATE" || /^\d{8}$/.test(value)) {
    return "date";
  }

  if (params.TZID) {
    return "zoned";
  }

  if (String(value).endsWith("Z")) {
    return "utc";
  }

  return "floating";
}

function isCalendarResponse({ url, contentType, body }) {
  const normalizedContentType = String(contentType || "").toLowerCase();
  const normalizedBody = String(body || "").trimStart();

  return normalizedContentType.includes("text/calendar")
    || normalizedContentType.includes("application/ics")
    || String(url || "").toLowerCase().endsWith(".ics")
    || normalizedBody.startsWith("BEGIN:VCALENDAR");
}

function mergeCountMaps(targetMap, sourceObject) {
  Object.entries(sourceObject).forEach(([key, count]) => {
    targetMap.set(key, (targetMap.get(key) || 0) + count);
  });
}

function toSortedCountList(countMap) {
  return [...countMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function logInfo(logger, message) {
  if (typeof logger === "function") {
    logger(message);
  }
}
