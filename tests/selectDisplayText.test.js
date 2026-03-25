import { describe, expect, it } from "vitest";

import { selectDisplayText } from "../src/contentDisplay.js";

describe("selectDisplayText", () => {
  describe("Summary Handling", () => {
    it("returns summary without truncation when available", () => {
      const item = {
        summaryCandidates: [{ field: "summary", text: "Brief post summary" }],
        contentCandidates: [{ field: "content:encoded", text: "x".repeat(1000) }],
      };

      const result = selectDisplayText(item);
      expect(result.text).toBe("Brief post summary");
      expect(result.wasTruncated).toBe(false);
    });

    it("prefers summary over description when both present", () => {
      const item = {
        summaryCandidates: [
          { field: "summary", text: "Summary text" },
          { field: "description", text: "Description text" },
        ],
        contentCandidates: [],
      };

      const result = selectDisplayText(item);
      expect(result.text).toBe("Summary text");
      expect(result.wasTruncated).toBe(false);
    });

    it("prefers description over contentSnippet when summary missing", () => {
      const item = {
        summaryCandidates: [
          { field: "description", text: "Description text" },
          { field: "contentSnippet", text: "Snippet text" },
        ],
        contentCandidates: [],
      };

      const result = selectDisplayText(item);
      expect(result.text).toBe("Description text");
      expect(result.wasTruncated).toBe(false);
    });

    it("uses contentSnippet as fallback when summary and description missing", () => {
      const item = {
        summaryCandidates: [
          { field: "contentSnippet", text: "Snippet provides fallback" },
        ],
        contentCandidates: [],
      };

      const result = selectDisplayText(item);
      expect(result.text).toBe("Snippet provides fallback");
      expect(result.wasTruncated).toBe(false);
    });

    it("treats empty/whitespace-only summary as missing", () => {
      const item = {
        summaryCandidates: [
          { field: "summary", text: "   " },
          { field: "description", text: "Description fallback" },
        ],
        contentCandidates: [],
      };

      const result = selectDisplayText(item);
      expect(result.text).toBe("Description fallback");
      expect(result.wasTruncated).toBe(false);
    });

    it("uses HTML summary when text is empty but HTML exists", () => {
      const item = {
        summaryCandidates: [
          { field: "summary", html: "<p>HTML summary</p>", text: "" },
        ],
        contentCandidates: [],
      };

      const result = selectDisplayText(item);
      expect(result.text).toBe("<p>HTML summary</p>");
      expect(result.wasTruncated).toBe(false);
    });
  });

  describe("Content Truncation", () => {
    it("returns trimmed content with ellipsis when summaries missing", () => {
      const longText = "x".repeat(600);
      const item = {
        summaryCandidates: [],
        contentCandidates: [
          { field: "content:encoded", text: longText },
        ],
      };

      const result = selectDisplayText(item);
      expect(result.text).toHaveLength(501); // 500 chars + "…"
      expect(result.text).toMatch(/…$/);
      expect(result.wasTruncated).toBe(true);
    });

    it("truncates at exactly 500 characters", () => {
      const longText = "x".repeat(600);
      const item = {
        summaryCandidates: [],
        contentCandidates: [
          { field: "content:encoded", text: longText },
        ],
      };

      const result = selectDisplayText(item);
      const withoutEllipsis = result.text.slice(0, -1); // Remove "…"
      expect(withoutEllipsis).toHaveLength(500);
      expect(withoutEllipsis).toBe("x".repeat(500));
    });

    it("does not add ellipsis when content under 500 chars", () => {
      const shortText = "Short content under limit";
      const item = {
        summaryCandidates: [],
        contentCandidates: [
          { field: "content:encoded", text: shortText },
        ],
      };

      const result = selectDisplayText(item);
      expect(result.text).toBe(shortText);
      expect(result.wasTruncated).toBe(false);
      expect(result.text).not.toContain("…");
    });

    it("returns content as-is when exactly 500 characters", () => {
      const exactText = "x".repeat(500);
      const item = {
        summaryCandidates: [],
        contentCandidates: [
          { field: "content:encoded", text: exactText },
        ],
      };

      const result = selectDisplayText(item);
      expect(result.text).toBe(exactText);
      expect(result.wasTruncated).toBe(false);
    });

    it("prefers content:encoded over content when both present", () => {
      const item = {
        summaryCandidates: [],
        contentCandidates: [
          { field: "content:encoded", text: "Encoded: " + "x".repeat(600) },
          { field: "content", text: "Simple: " + "y".repeat(600) },
        ],
      };

      const result = selectDisplayText(item);
      expect(result.text).toContain("Encoded:");
      expect(result.wasTruncated).toBe(true);
    });

    it("adds ellipsis only once even if truncation needed", () => {
      const longText = "x".repeat(700);
      const item = {
        summaryCandidates: [],
        contentCandidates: [
          { field: "content:encoded", text: longText },
        ],
      };

      const result = selectDisplayText(item);
      const ellipsisCount = (result.text.match(/…/g) || []).length;
      expect(ellipsisCount).toBe(1);
    });
  });

  describe("Priority Ordering", () => {
    it("respects summary > description > contentSnippet priority", () => {
      const item = {
        summaryCandidates: [
          { field: "summary", text: "Summary" },
          { field: "description", text: "Description" },
          { field: "contentSnippet", text: "Snippet" },
        ],
        contentCandidates: [
          { field: "content:encoded", text: "x".repeat(600) },
        ],
      };

      const result = selectDisplayText(item);
      expect(result.text).toBe("Summary");
    });

    it("uses content only when all summaries missing", () => {
      const item = {
        summaryCandidates: [
          { field: "summary", text: "" },
          { field: "description", text: null },
        ],
        contentCandidates: [
          { field: "content:encoded", text: "x".repeat(600) },
        ],
      };

      const result = selectDisplayText(item);
      expect(result.wasTruncated).toBe(true);
      expect(result.text).toHaveLength(501); // 500 chars + "…"
    });

    it("falls back to content:encoded when summary is empty object", () => {
      const item = {
        summaryCandidates: [{}],
        contentCandidates: [
          { field: "content:encoded", text: "x".repeat(600) },
        ],
      };

      const result = selectDisplayText(item);
      expect(result.wasTruncated).toBe(true);
    });
  });

  describe("Missing Values", () => {
    it("returns null when both summaries and content missing", () => {
      const item = {
        summaryCandidates: [],
        contentCandidates: [],
      };

      const result = selectDisplayText(item);
      expect(result.text).toBeNull();
      expect(result.wasTruncated).toBe(false);
    });

    it("returns null when candidates undefined", () => {
      const item = {
        summaryCandidates: undefined,
        contentCandidates: undefined,
      };

      const result = selectDisplayText(item);
      expect(result.text).toBeNull();
      expect(result.wasTruncated).toBe(false);
    });

    it("returns null when all candidates empty", () => {
      const item = {
        summaryCandidates: [
          { field: "summary", text: "" },
          { field: "description", text: null },
        ],
        contentCandidates: [
          { field: "content:encoded", text: "" },
          { field: "content", text: null },
        ],
      };

      const result = selectDisplayText(item);
      expect(result.text).toBeNull();
      expect(result.wasTruncated).toBe(false);
    });

    it("does not create placeholder text", () => {
      const item = {
        summaryCandidates: [],
        contentCandidates: [],
      };

      const result = selectDisplayText(item);
      expect(result.text).not.toBe("(no content)");
      expect(result.text).not.toBe("N/A");
      expect(result.text).toBeNull();
    });
  });

  describe("HTML Content Handling", () => {
    it("returns HTML from content candidates when truncated", () => {
      const longHtml = "<p>" + "x".repeat(600) + "</p>";
      const item = {
        summaryCandidates: [],
        contentCandidates: [
          { field: "content:encoded", html: longHtml, text: "x".repeat(600) },
        ],
      };

      const result = selectDisplayText(item);
      // Should use text version for truncation, not HTML
      expect(result.wasTruncated).toBe(true);
      expect(result.text).toHaveLength(501); // 500 chars + "…"
    });

    it("prefers text content over HTML when both present", () => {
      const item = {
        summaryCandidates: [],
        contentCandidates: [
          {
            field: "content:encoded",
            html: "<p>HTML content</p>",
            text: "Text content",
          },
        ],
      };

      const result = selectDisplayText(item);
      expect(result.text).toBe("Text content");
    });
  });

  describe("Return Value Structure", () => {
    it("always returns object with text and wasTruncated properties", () => {
      const item = {
        summaryCandidates: [{ field: "summary", text: "Text" }],
        contentCandidates: [],
      };

      const result = selectDisplayText(item);
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("wasTruncated");
      expect(typeof result.wasTruncated).toBe("boolean");
    });

    it("text is either string or null", () => {
      const item1 = {
        summaryCandidates: [{ field: "summary", text: "Text" }],
        contentCandidates: [],
      };
      const result1 = selectDisplayText(item1);
      expect(typeof result1.text === "string" || result1.text === null).toBe(
        true,
      );

      const item2 = {
        summaryCandidates: [],
        contentCandidates: [],
      };
      const result2 = selectDisplayText(item2);
      expect(result2.text).toBeNull();
    });
  });
});
