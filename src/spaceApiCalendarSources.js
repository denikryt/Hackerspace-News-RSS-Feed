import { load } from "cheerio";

// The wiki page contains several unrelated tables, so extraction must stay
// anchored to the explicit "Spaces with SpaceAPI" section and its table.
export function extractSpaceApiSourceRows({ html, sourcePageUrl }) {
  const $ = load(html);
  const sectionHeadline = $("#Spaces_with_SpaceAPI");

  if (!sectionHeadline.length) {
    throw new Error("SpaceAPI section heading not found");
  }

  const sectionHeading = sectionHeadline.closest("h3");
  const table = sectionHeading.nextAll("table").first();

  if (!table.length) {
    throw new Error("SpaceAPI source table not found");
  }

  const headers = table
    .find("tr")
    .first()
    .find("th")
    .map((_, element) => $(element).text().trim())
    .get();

  const expectedHeaders = ["Hackerspace", "SpaceAPI", "Country"];
  if (headers.join("|") !== expectedHeaders.join("|")) {
    throw new Error("Unexpected SpaceAPI table headers");
  }

  return table
    .find("tr[data-row-number]")
    .map((_, rowElement) => {
      const row = $(rowElement);
      const cells = row.find("td");
      const hackerspaceLink = cells.eq(0).find("a").first();
      const spaceApiLink = cells.eq(1).find("a").first();
      const hackerspaceWikiPath = hackerspaceLink.attr("href")?.trim() || "";
      const spaceApiUrl = decodeHtmlEntities(spaceApiLink.attr("href")?.trim() || "");

      return {
        rowNumber: Number(row.attr("data-row-number")),
        hackerspaceName: hackerspaceLink.text().trim(),
        hackerspaceWikiPath,
        hackerspaceWikiUrl: new URL(hackerspaceWikiPath, sourcePageUrl).toString(),
        country: cells.eq(2).text().trim(),
        spaceApiUrl,
        dedupeKey: spaceApiUrl,
      };
    })
    .get()
    .filter((row) => row.spaceApiUrl);
}

// Real SpaceAPI responses observed for calendar links use one stable field:
// feeds.calendar.url. Keep the rule narrow instead of scanning arbitrary keys.
export function extractCalendarFeedUrlFromSpaceApi(payload) {
  const value = payload?.feeds?.calendar?.url;
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!/^https?:\/\//iu.test(normalized)) {
    return null;
  }

  return normalized;
}

// Existing calendar sources are hand-maintained; discovery only appends
// entries whose ICS URL is not already present in the file.
export function mergeDiscoveredCalendarSources(existingItems, discoveredItems) {
  const normalizedExistingItems = Array.isArray(existingItems) ? existingItems : [];
  const seenUrls = new Set(
    normalizedExistingItems
      .map((item) => (typeof item?.url === "string" ? item.url.trim() : ""))
      .filter(Boolean),
  );

  const appendedItems = [];
  for (const item of Array.isArray(discoveredItems) ? discoveredItems : []) {
    const normalizedUrl = typeof item?.url === "string" ? item.url.trim() : "";
    if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
      continue;
    }

    seenUrls.add(normalizedUrl);
    appendedItems.push({
      url: normalizedUrl,
      country: typeof item.country === "string" ? item.country.trim() : "",
      hs_name: typeof item.hs_name === "string" ? item.hs_name.trim() : "",
    });
  }

  return {
    items: [...normalizedExistingItems, ...appendedItems],
    addedCount: appendedItems.length,
  };
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}
