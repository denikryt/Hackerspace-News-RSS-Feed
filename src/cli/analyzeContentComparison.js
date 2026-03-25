import { parseFeedBody } from "../feedParser.js";
import { probeFeedUrl } from "../feedProbe.js";
import { fetchPageHtml } from "../pageFetcher.js";
import { extractSourceRows } from "../sourceTableExtractor.js";
import { writeJson } from "../storage.js";
import { SOURCE_PAGE_URL } from "../config.js";
import { resolve } from "node:path";

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function isTextStartOf(snippet, fullText) {
  if (!snippet || !fullText) return false;

  const cleanSnippet = normalizeText(stripHtml(snippet));
  const cleanFull = normalizeText(stripHtml(fullText));

  // Check if cleaned snippet is a prefix of cleaned full text
  // Allow for slight variation (summary might be truncated)
  if (cleanFull.startsWith(cleanSnippet)) {
    return true;
  }

  // Also check if snippet is at least 80% similar at the start
  const minLen = Math.min(cleanSnippet.length, cleanFull.length);
  if (minLen > 100) {
    const snippet80 = cleanSnippet.substring(0, Math.floor(minLen * 0.8));
    return cleanFull.startsWith(snippet80);
  }

  return false;
}

export async function analyzeContentComparison({
  sourcePageUrl = SOURCE_PAGE_URL,
  fetchImpl = fetch,
  limit = 1000,
} = {}) {
  const html = await fetchPageHtml({ sourcePageUrl, fetchImpl });
  const sourceRows = extractSourceRows({ html, sourcePageUrl });

  const examples = [];

  let processedFeeds = 0;
  for (const sourceRow of sourceRows) {
    if (processedFeeds >= limit) break;

    const validation = await probeFeedUrl({ sourceRow, fetchImpl });
    if (!validation.fetchOk || !validation.isParsable || !validation.body) continue;

    try {
      const parsed = await parseFeedBody({ xml: validation.body, validation });
      const items = parsed.items || [];

      for (const item of items) {
        // Skip if no content/summary at all
        if (!item.content && !item.summary) {
          continue;
        }

        const contentText = item.content || null;
        const summaryText = item.summary || null;
        const snippetText = item.contentSnippet || null;

        // Check if summary just copies the start of content
        const summaryCopiesContentStart =
          summaryText && contentText && isTextStartOf(summaryText, contentText);

        examples.push({
          spaceName: sourceRow.hackerspaceName,
          itemTitle: item.title || "(no title)",
          feedUrl: validation.finalUrl || sourceRow.candidateFeedUrl,

          // Availability flags
          hasSummary: !!summaryText,
          hasContentSnippet: !!snippetText,

          // Content pattern flag
          summaryCopiesContentStart,

          // Lengths for comparison
          summaryLength: summaryText ? String(summaryText).length : 0,
          contentSnippetLength: snippetText ? String(snippetText).length : 0,
          contentLength: contentText ? String(contentText).length : 0,

          // Store full summary only
          ...(summaryText && {
            summary: stripHtml(summaryText),
          }),
        });
      }

      processedFeeds += 1;
    } catch (error) {
      // skip errors
    }
  }

  const output = {
    timestamp: new Date().toISOString(),
    feedsProcessed: processedFeeds,
    totalExamples: examples.length,
    itemsWithSummaryOnly: examples.filter((e) => e.hasSummary).length,
    itemsWithContentSnippet: examples.filter((e) => e.hasContentSnippet).length,
    summaryCopiesContentStartCount: examples.filter((e) => e.summaryCopiesContentStart).length,
    avgContentSnippetLength: Math.round(
      examples.filter((e) => e.contentSnippetLength > 0).reduce((sum, e) => sum + e.contentSnippetLength, 0) /
        examples.filter((e) => e.contentSnippetLength > 0).length
    ),
    examples,
  };

  const outputPath = resolve(process.cwd(), "analysis/content_comparison.json");
  await writeJson(outputPath, output);

  console.log(`Written ${examples.length} examples to ${outputPath}`);
  return output;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeContentComparison().catch(console.error);
}
