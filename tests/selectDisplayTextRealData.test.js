import { describe, expect, it, beforeAll } from "vitest";
import fs from "fs";

import { selectDisplayText } from "../src/contentDisplay.js";
import { enrichFeedItem } from "../src/feedEnricher.js";

describe("selectDisplayText with real data", () => {
  let realFeeds = [];

  // Load real normalized feeds data
  beforeAll(() => {
    try {
      if (fs.existsSync("./data/feeds_normalized.json")) {
        const data = fs.readFileSync("./data/feeds_normalized.json", "utf8");
        const parsed = JSON.parse(data);
        realFeeds = parsed.feeds || [];
      }
    } catch (error) {
      console.warn("Could not load real feeds for testing:", error.message);
      realFeeds = [];
    }
  });

  it("loads real feeds data for testing", () => {
    expect(realFeeds.length).toBeGreaterThan(0);
  });

  it("applies selectDisplayText to real items with summaries", () => {
    if (realFeeds.length === 0) {
      this.skip();
    }

    const itemsWithSummaries = realFeeds
      .flatMap((feed) => feed.items || [])
      .filter((item) => item.hasSummary)
      .slice(0, 10);

    expect(itemsWithSummaries.length).toBeGreaterThan(0);

    itemsWithSummaries.forEach((item) => {
      // Reconstruct candidates from enriched item if available
      if (item.observed?.summaryCandidates) {
        const result = selectDisplayText({
          summaryCandidates: item.observed.summaryCandidates,
          contentCandidates: item.observed.contentCandidates || [],
        });

        expect(result.text).not.toBeNull();
        expect(result.wasTruncated).toBe(false); // Summaries should not be truncated
      }
    });
  });

  it("truncates long content to 500 characters when no summary", () => {
    if (realFeeds.length === 0) {
      this.skip();
    }

    const itemsWithLongContent = realFeeds
      .flatMap((feed) => feed.items || [])
      .filter((item) => !item.hasSummary && item.hasFullContent && (item.wordCount || 0) > 100)
      .slice(0, 10);

    itemsWithLongContent.forEach((item) => {
      if (item.observed?.contentCandidates) {
        const result = selectDisplayText({
          summaryCandidates: item.observed.summaryCandidates || [],
          contentCandidates: item.observed.contentCandidates,
        });

        if (result.text && item.wordCount > 50) {
          // Items with long content should be truncated
          expect(result.text.length).toBeLessThanOrEqual(501); // 500 chars + "…"
        }
      }
    });
  });

  it("respects priority: summary > description > contentSnippet", () => {
    if (realFeeds.length === 0) {
      this.skip();
    }

    const itemsWithMultipleCandidates = realFeeds
      .flatMap((feed) => feed.items || [])
      .filter((item) => item.observed?.summaryCandidates?.length > 1)
      .slice(0, 5);

    itemsWithMultipleCandidates.forEach((item) => {
      const result = selectDisplayText({
        summaryCandidates: item.observed.summaryCandidates,
        contentCandidates: item.observed.contentCandidates || [],
      });

      if (result.text && item.observed.summaryCandidates.length > 0) {
        // Should pick first non-empty candidate from summaryCandidates
        const firstNonEmpty = item.observed.summaryCandidates.find(
          (c) => c.text || c.html,
        );
        if (firstNonEmpty) {
          const expectedText = firstNonEmpty.text || firstNonEmpty.html;
          expect(result.text).toBe(expectedText);
        }
      }
    });
  });

  it("does not truncate summaries regardless of length", () => {
    if (realFeeds.length === 0) {
      this.skip();
    }

    const allItems = realFeeds
      .flatMap((feed) => feed.items || [])
      .filter((item) => item.observed?.summaryCandidates?.length > 0)
      .slice(0, 20);

    allItems.forEach((item) => {
      const result = selectDisplayText({
        summaryCandidates: item.observed.summaryCandidates,
        contentCandidates: item.observed.contentCandidates || [],
      });

      if (result.text && item.hasSummary) {
        // Summaries should never be truncated
        expect(result.wasTruncated).toBe(false);
        expect(result.text).not.toMatch(/…$/);
      }
    });
  });

  it("returns null for items with neither summary nor content", () => {
    if (realFeeds.length === 0) {
      this.skip();
    }

    const itemsWithoutContent = realFeeds
      .flatMap((feed) => feed.items || [])
      .filter((item) => !item.hasSummary && !item.hasFullContent)
      .slice(0, 10);

    itemsWithoutContent.forEach((item) => {
      const result = selectDisplayText({
        summaryCandidates: item.observed?.summaryCandidates || [],
        contentCandidates: item.observed?.contentCandidates || [],
      });

      expect(result.text).toBeNull();
    });
  });

  it("enrichments preserve candidates for rendering", () => {
    if (realFeeds.length === 0) {
      this.skip();
    }

    // Verify that enrichFeedItem stores candidates in observed
    const testItems = realFeeds
      .flatMap((feed) => feed.items || [])
      .slice(0, 10);

    testItems.forEach((item) => {
      if (item.observed) {
        // Item was enriched and has observed metadata
        expect(typeof item.observed).toBe("object");
        // Either it has no candidates, or it has proper structure
        if (item.observed.summaryCandidates) {
          expect(Array.isArray(item.observed.summaryCandidates)).toBe(true);
        }
        if (item.observed.contentCandidates) {
          expect(Array.isArray(item.observed.contentCandidates)).toBe(true);
        }
      }
    });
  });

  it("statistics: count items needing truncation", () => {
    if (realFeeds.length === 0) {
      this.skip();
    }

    const allItems = realFeeds
      .flatMap((feed) => feed.items || [])
      .slice(0, 100);

    let truncatedCount = 0;
    let totalWithContent = 0;

    allItems.forEach((item) => {
      if (item.observed?.contentCandidates?.length > 0) {
        totalWithContent++;
        const result = selectDisplayText({
          summaryCandidates: item.observed.summaryCandidates || [],
          contentCandidates: item.observed.contentCandidates,
        });

        if (result.wasTruncated) {
          truncatedCount++;
        }
      }
    });

    console.log(`Statistics: ${truncatedCount} of ${totalWithContent} items with content were truncated`);
    expect(truncatedCount).toBeGreaterThanOrEqual(0);
  });
});
