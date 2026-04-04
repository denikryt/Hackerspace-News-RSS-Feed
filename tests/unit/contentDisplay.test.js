import { describe, expect, it } from "vitest";

import {
  buildDisplayContent,
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

  it("falls back to plain text with preserved line breaks", () => {
    const display = buildDisplayContent({
      title: "Post",
      summaryText: "First line\nSecond line",
    });

    expect(display.renderMode).toBe("text");
    expect(display.text).toBe("First line\nSecond line");
    expect(display.html).toBeUndefined();
  });

  it("normalizes attachment links from enclosures", () => {
    const display = buildDisplayContent({
      title: "Post",
      attachments: [
        {
          url: "https://example.com/audio.mp3",
          type: "audio/mpeg",
        },
      ],
    });

    expect(display.attachments).toEqual([
      {
        url: "https://example.com/audio.mp3",
        type: "audio/mpeg",
        label: "audio.mp3",
      },
    ]);
  });

  it("renders both inline html images and image attachments", () => {
    const html = renderDisplayContent({
      title: "Post",
      contentHtml: `
        <p>Lead text</p>
        <p><img src="https://example.com/inline.png" alt="Inline image"></p>
      `,
      attachments: [
        {
          url: "https://example.com/attachment.jpg",
          type: "image/jpeg",
          title: "Attachment image",
        },
      ],
    });

    expect(html).toContain('<img src="https://example.com/inline.png" alt="Inline image">');
    expect(html).toContain('class="attachment-images"');
    expect(html).toContain('<img src="https://example.com/attachment.jpg" alt="Attachment image">');
    expect(html).toContain('href="https://example.com/attachment.jpg"');
    expect(html).toContain(">Attachments<");
  });

  it("deduplicates repeated attachments before rendering images and links", () => {
    const display = buildDisplayContent({
      title: "Post",
      attachments: [
        {
          url: "https://example.com/image.jpg?width=600",
          type: "image/jpeg",
          title: "image.jpg",
        },
        {
          url: "https://example.com/image.jpg?width=600",
          type: "image/jpeg",
          title: "image.jpg",
        },
      ],
    });

    expect(display.attachments).toEqual([
      {
        url: "https://example.com/image.jpg?width=600",
        type: "image/jpeg",
        label: "image.jpg",
      },
    ]);
  });
});
