import { load } from "cheerio";

export function extractWebsiteSourceRows({ html, sourcePageUrl }) {
  const $ = load(html);
  const rows = [];
  const seen = new Set();

  $("table").each((_, tableElement) => {
    const table = $(tableElement);
    const headerCells = table.find("tr").first().find("th");
    const headers = headerCells
      .map((_, cell) => $(cell).text().trim().toLowerCase())
      .get();

    const hackerspaceIndex = headers.indexOf("hackerspace");
    const websiteIndex = headers.indexOf("website");
    const countryIndex = headers.indexOf("country");

    if (hackerspaceIndex === -1 || websiteIndex === -1) {
      return;
    }

    table.find("tr[data-row-number]").each((_, rowElement) => {
      const row = $(rowElement);
      const cells = row.find("td");
      const hackerspaceLink = cells.eq(hackerspaceIndex).find("a").first();
      const websiteLink = cells.eq(websiteIndex).find("a").first();
      const href = decodeHtmlEntities(websiteLink.attr("href")?.trim() || "");

      if (!href) {
        return;
      }

      const siteUrl = normalizeHttpUrl(href, sourcePageUrl);
      if (!siteUrl || seen.has(siteUrl)) {
        return;
      }

      seen.add(siteUrl);
      rows.push({
        rowNumber: Number(row.attr("data-row-number")),
        hackerspaceName: hackerspaceLink.text().trim(),
        hackerspaceWikiPath: hackerspaceLink.attr("href")?.trim() || "",
        hackerspaceWikiUrl: new URL(hackerspaceLink.attr("href")?.trim() || "", sourcePageUrl).toString(),
        siteUrl,
        country: countryIndex === -1 ? "" : cells.eq(countryIndex).text().trim(),
        dedupeKey: siteUrl,
      });
    });
  });

  return rows;
}

function normalizeHttpUrl(value, baseUrl) {
  try {
    const url = new URL(value, baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}
