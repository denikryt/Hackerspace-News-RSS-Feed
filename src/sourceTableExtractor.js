import { load } from "cheerio";

export function extractSourceRows({ html, sourcePageUrl }) {
  const $ = load(html);
  const sectionHeadline = $("#Spaces_with_RSS_feeds");

  if (!sectionHeadline.length) {
    throw new Error("RSS section heading not found");
  }

  const sectionHeading = sectionHeadline.closest("h3");
  const table = sectionHeading.nextAll("table").first();

  if (!table.length) {
    throw new Error("RSS source table not found");
  }

  const headers = table
    .find("tr")
    .first()
    .find("th")
    .map((_, element) => $(element).text().trim())
    .get();

  const expectedHeaders = ["Hackerspace", "Newsfeed", "Country"];
  if (headers.join("|") !== expectedHeaders.join("|")) {
    throw new Error("Unexpected RSS table headers");
  }

  const rows = table
    .find("tr[data-row-number]")
    .map((_, rowElement) => {
      const row = $(rowElement);
      const cells = row.find("td");
      const hackerspaceLink = cells.eq(0).find("a").first();
      const newsfeedLink = cells.eq(1).find("a").first();

      const hackerspaceWikiPath = hackerspaceLink.attr("href")?.trim();
      const candidateFeedUrl = decodeHtmlEntities(newsfeedLink.attr("href")?.trim() || "");

      return {
        rowNumber: Number(row.attr("data-row-number")),
        hackerspaceName: hackerspaceLink.text().trim(),
        hackerspaceWikiPath,
        hackerspaceWikiUrl: new URL(hackerspaceWikiPath, sourcePageUrl).toString(),
        candidateFeedUrl,
        rawHref: candidateFeedUrl,
        country: cells.eq(2).text().trim(),
        dedupeKey: candidateFeedUrl,
      };
    })
    .get();

  const dedupedRows = [];
  const seen = new Set();

  for (const row of rows) {
    if (seen.has(row.dedupeKey)) {
      continue;
    }
    seen.add(row.dedupeKey);
    dedupedRows.push(row);
  }

  return dedupedRows;
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}
