import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    feed: ["language", "updated", "lastBuildDate"],
    item: [
      "summary",
      "content:encoded",
      "creator",
      "published",
      "updated",
      "media:content",
      "media:thumbnail",
    ],
  },
});

export async function parseFeedBody({ xml, validation }) {
  const parsed = await parser.parseString(xml);

  return {
    ...parsed,
    _detectedFormat: validation.detectedFormat || null,
  };
}
