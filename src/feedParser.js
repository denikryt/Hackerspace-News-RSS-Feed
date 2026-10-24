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
  let parsed;
  try {
    parsed = await parser.parseString(xml);
  } catch {
    // XML parser messages can quote remote tag names or content. Callers log
    // this error, so expose only the stable acquisition contract here.
    throw Object.assign(new Error("parse_error"), { code: "parse_error" });
  }

  return {
    ...parsed,
    _detectedFormat: validation.detectedFormat || null,
  };
}
