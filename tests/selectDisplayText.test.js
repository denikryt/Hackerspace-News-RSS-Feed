import { describe, expect, it } from "vitest";

import { selectDisplayText } from "../src/contentDisplay.js";

describe("selectDisplayText", () => {
  describe("Summary Handling", () => {
    it("prefers content over summary when both are available", () => {
      const item = {
        summaryCandidates: [{ field: "summary", text: "Brief post summary" }],
        contentCandidates: [{ field: "content:encoded", text: "Primary content body" }],
      };

      const result = selectDisplayText(item);
      expect(result.text).toBe("Primary content body");
      expect(result.wasTruncated).toBe(false);
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("content:encoded");
    });

    it("truncates summary when it exceeds the max length", () => {
      const longSummary = "x".repeat(700);
      const item = {
        summaryCandidates: [{ field: "summary", text: longSummary }],
        contentCandidates: [],
      };

      const result = selectDisplayText(item);
      const withoutEllipsis = result.text.slice(0, -1);

      expect(result.wasTruncated).toBe(true);
      expect(result.text).toMatch(/…$/);
      expect(withoutEllipsis).toHaveLength(500);
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("summary");
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
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("summary");
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
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("description");
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
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("contentSnippet");
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
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("description");
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
      expect(result.format).toBe("html");
      expect(result.sourceField).toBe("summary");
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
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("content:encoded");
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
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("content:encoded");
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
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("content:encoded");
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
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("content:encoded");
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
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("content:encoded");
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
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("content:encoded");
    });

    it("truncates at the last whitespace before the limit when possible", () => {
      const words = Array.from({ length: 200 }, (_, index) => `word${index}`);
      const longText = words.join(" ");
      const item = {
        summaryCandidates: [],
        contentCandidates: [{ field: "content:encoded", text: longText }],
      };

      const result = selectDisplayText(item);
      expect(result.wasTruncated).toBe(true);
      expect(result.text).toMatch(/…$/);
      const withoutEllipsis = result.text.slice(0, -1);
      expect(withoutEllipsis.length).toBeLessThanOrEqual(500);
      expect(longText.startsWith(withoutEllipsis.trimEnd())).toBe(true);
      const nextChar = longText.charAt(withoutEllipsis.length);
      expect(nextChar).toBe(" ");
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("content:encoded");
    });

    it("avoids splitting surrogate pairs when truncating multibyte characters", () => {
      const longText = Array.from({ length: 260 }, () => "😀😀").join(" ");
      const item = {
        summaryCandidates: [],
        contentCandidates: [{ field: "content:encoded", text: longText }],
      };

      const result = selectDisplayText(item);
      expect(result.wasTruncated).toBe(true);
      const withoutEllipsis = result.text.slice(0, -1);
      const lastCodeUnit = withoutEllipsis.charCodeAt(withoutEllipsis.length - 1);
      const isHighSurrogate = lastCodeUnit >= 0xd800 && lastCodeUnit <= 0xdbff;
      expect(isHighSurrogate).toBe(false);
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("content:encoded");
    });
  });

  describe("Priority Ordering", () => {
    it("uses content before summary candidates when content is present", () => {
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
      expect(result.wasTruncated).toBe(true);
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("content:encoded");
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
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("content:encoded");
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
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("content:encoded");
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
      expect(result.format).toBeNull();
      expect(result.sourceField).toBeNull();
    });

    it("returns null when candidates undefined", () => {
      const item = {
        summaryCandidates: undefined,
        contentCandidates: undefined,
      };

      const result = selectDisplayText(item);
      expect(result.text).toBeNull();
      expect(result.wasTruncated).toBe(false);
      expect(result.format).toBeNull();
      expect(result.sourceField).toBeNull();
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
      expect(result.format).toBeNull();
      expect(result.sourceField).toBeNull();
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
      expect(result.format).toBeNull();
      expect(result.sourceField).toBeNull();
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
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("content:encoded");
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
      expect(result.format).toBe("text");
      expect(result.sourceField).toBe("content:encoded");
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
      expect(result).toHaveProperty("format");
      expect(result).toHaveProperty("sourceField");
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
      expect(result1.format === "text" || result1.format === "html").toBe(true);

      const item2 = {
        summaryCandidates: [],
        contentCandidates: [],
      };
      const result2 = selectDisplayText(item2);
      expect(result2.text).toBeNull();
      expect(result2.format).toBeNull();
      expect(result2.sourceField).toBeNull();
    });
  });
});
