import { describe, expect, it } from "vitest";

import {
  renderDisplayContent,
  sanitizeContentHtml,
} from "../../src/contentDisplay.js";

describe("contentDisplay", () => {
  it("keeps safe links and formatting in sanitized html", () => {
    const html = sanitizeContentHtml(`
      <p>Hello <a href="https://example.com/post">world</a></p>
      <script>alert(1)</script>
      <p><img src="https://example.com/image.png" onerror="alert(1)" alt="Preview"></p>
    `);

    expect(html).toContain('<a href="https://example.com/post"');
    expect(html).toContain('<img src="https://example.com/image.png" alt="Preview">');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror=");
  });

  it("renders plain text body with preserved line breaks", () => {
    const html = renderDisplayContent({
      observed: {
        summaryCandidates: [{ field: "summary", text: "First line\nSecond line" }],
        contentCandidates: [],
      },
    });

    expect(html).toContain('class="content-body plain-text"');
    expect(html).toContain("First line\nSecond line");
  });

  it("renders attachment links for safe enclosures", () => {
    const html = renderDisplayContent({
      attachments: [
        {
          url: "https://example.com/audio.mp3",
          type: "audio/mpeg",
        },
      ],
      observed: {
        summaryCandidates: [],
        contentCandidates: [],
      },
    });

    expect(html).toContain("Attachments");
    expect(html).toContain("audio.mp3");
    expect(html).toContain("audio/mpeg");
  });

  it("renders from persisted display content without raw content candidates", () => {
    const html = renderDisplayContent({
      displayContent: {
        text: "Persisted display text…",
        wasTruncated: true,
        format: "text",
        sourceField: "content:encoded",
      },
      observed: {
        summaryCandidates: [],
      },
    });

    expect(html).toContain('class="content-body plain-text"');
    expect(html).toContain("Persisted display text…");
  });

  it("renders read more link when truncated display text has original link", () => {
    const html = renderDisplayContent({
      link: "https://example.com/original-post",
      displayContent: {
        text: "Persisted display text…",
        wasTruncated: true,
        format: "text",
        sourceField: "content:encoded",
      },
      observed: {
        summaryCandidates: [],
      },
    });

    expect(html).toContain(">Read more<");
    expect(html).toContain('href="https://example.com/original-post"');
  });

  it("does not render read more link when display text is not truncated", () => {
    const html = renderDisplayContent({
      link: "https://example.com/original-post",
      displayContent: {
        text: "Persisted display text",
        wasTruncated: false,
        format: "text",
        sourceField: "content:encoded",
      },
      observed: {
        summaryCandidates: [],
      },
    });

    expect(html).not.toContain(">Read more<");
  });

  it("does not throw when html display falls back after sanitization removes everything", () => {
    expect(() =>
      renderDisplayContent({
        displayContent: {
          text: '<iframe src="https://example.com/embed"></iframe>',
          wasTruncated: false,
          format: "html",
          sourceField: "summary",
        },
        observed: {
          summaryCandidates: [],
        },
      }),
    ).not.toThrow();
  });
});
