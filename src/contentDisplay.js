import { load } from "cheerio";

import { escapeHtml } from "./renderers/layout.js";
import { selectDisplayText, truncatePlainText, truncateHtml } from "./displayText.js";

export { selectDisplayText } from "./displayText.js";

const MAX_CONTENT_LENGTH = 500;

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "a",
  "strong",
  "em",
  "b",
  "i",
  "blockquote",
  "code",
  "pre",
  "img",
]);

const ALLOWED_ATTRIBUTES = {
  a: new Set(["href", "title"]),
  img: new Set(["src", "alt", "title"]),
};

export function buildDisplayContent(item) {
  const sanitizedHtml = sanitizeContentHtml(item.contentHtml || item.summaryHtml);
  const attachments = normalizeDisplayAttachments(item.attachments);

  if (sanitizedHtml) {
    const plainLength = sanitizedHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length;
    if (plainLength > MAX_CONTENT_LENGTH) {
      const truncatedHtml = truncateHtml(sanitizedHtml, MAX_CONTENT_LENGTH);
      if (truncatedHtml) {
        return { renderMode: "html", html: truncatedHtml, wasTruncated: true, link: item.link, attachments };
      }
    }
    return { renderMode: "html", html: sanitizedHtml, wasTruncated: false, attachments };
  }

  const text = normalizeText(item.contentText || item.summaryText || item.summary);

  if (text) {
    const truncated = truncatePlainText(text, MAX_CONTENT_LENGTH);
    return {
      renderMode: "text",
      text: truncated.text,
      wasTruncated: truncated.wasTruncated,
      ...(truncated.wasTruncated ? { link: item.link } : {}),
      attachments,
    };
  }

  return {
    renderMode: attachments.length > 0 ? "attachments" : "empty",
    attachments,
  };
}

export function renderDisplayContent(item) {
  return renderDisplayModel(buildDisplayContent(item));
}

export function sanitizeContentHtml(value) {
  if (!value || !looksLikeHtml(value)) {
    return undefined;
  }

  const $ = load(`<div id="root">${String(value)}</div>`, null, false);
  const root = $("#root");

  root.find("*").each((_, element) => {
    const tagName = element.tagName?.toLowerCase();

    if (!tagName) {
      return;
    }

    if (!ALLOWED_TAGS.has(tagName)) {
      $(element).replaceWith($(element).contents());
      return;
    }

    const allowedAttributes = ALLOWED_ATTRIBUTES[tagName] || new Set();
    const attributes = { ...element.attribs };

    for (const [name, rawValue] of Object.entries(attributes)) {
      const attributeName = name.toLowerCase();

      if (attributeName.startsWith("on")) {
        $(element).removeAttr(name);
        continue;
      }

      if (!allowedAttributes.has(attributeName)) {
        $(element).removeAttr(name);
        continue;
      }

      if ((attributeName === "href" || attributeName === "src") && !isSafeUrl(rawValue)) {
        $(element).removeAttr(name);
      }
    }
  });

  const html = root.html()?.trim();
  return html || undefined;
}

function renderDisplayBody(display) {
  if (display.renderMode === "html" && display.html) {
    return `<div class="content-body rich-html">${display.html}</div>`;
  }

  if (display.renderMode === "text" && display.text) {
    return `<div class="content-body plain-text">${escapeHtml(display.text)}</div>`;
  }

  return "";
}

// Renderers can treat this as the stable HTML insertion boundary for prepared display content.
export function renderDisplayModel(display) {
  // Renderers may receive incomplete items during transitions, so a missing
  // prepared display object degrades to an empty slot instead of broken HTML.
  if (!display) {
    return "";
  }

  const body = renderDisplayBody(display);
  const readMore = renderReadMoreLink(display.link, display);
  const attachmentImages = renderAttachmentImages(display.attachments);
  const attachments = renderAttachments(display.attachments);

  return [body, readMore, attachmentImages, attachments].filter(Boolean).join("");
}

function renderAttachments(attachments) {
  if (!attachments?.length) {
    return "";
  }

  const items = attachments
    .map(
      (attachment) => `<li>
        <a href="${escapeHtml(attachment.url)}">${escapeHtml(attachment.label)}</a>
        ${attachment.type ? ` <span class="muted">(${escapeHtml(attachment.type)})</span>` : ""}
      </li>`,
    )
    .join("");

  return `<div class="attachments"><p class="field-label">Attachments</p><ul>${items}</ul></div>`;
}

function renderReadMoreLink(url, display) {
  if (!display?.wasTruncated || !url || !isSafeUrl(url)) {
    return "";
  }

  return `<p class="content-read-more"><a href="${escapeHtml(url)}">Read more</a></p>`;
}

function renderAttachmentImages(attachments) {
  const imageAttachments = (attachments || []).filter((attachment) => isImageAttachment(attachment));

  if (imageAttachments.length === 0) {
    return "";
  }

  const images = imageAttachments
    .map(
      (attachment) => `<figure class="attachment-image">
        <img src="${escapeHtml(attachment.url)}" alt="${escapeHtml(attachment.label || "Attachment image")}">
      </figure>`,
    )
    .join("");

  return `<div class="attachment-images">${images}</div>`;
}

function normalizeDisplayAttachments(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return [];
  }

  const normalizedAttachments = attachments
    .filter((attachment) => attachment?.url && isSafeUrl(attachment.url))
    .map((attachment) => ({
      url: attachment.url,
      type: attachment.type || undefined,
      label: attachment.title || attachment.label || getFileLabel(attachment.url),
    }));

  const dedupedAttachments = [];
  const seenAttachmentKeys = new Set();

  for (const attachment of normalizedAttachments) {
    const key = `${attachment.url}::${attachment.type || ""}::${attachment.label || ""}`;
    if (seenAttachmentKeys.has(key)) {
      continue;
    }

    seenAttachmentKeys.add(key);
    dedupedAttachments.push(attachment);
  }

  return dedupedAttachments;
}

function normalizeText(value) {
  if (!value) {
    return undefined;
  }

  const normalized = String(value).replace(/\r\n/g, "\n").trim();
  return normalized || undefined;
}

function looksLikeHtml(value) {
  return /<[^>]+>/.test(String(value));
}

function isSafeUrl(value) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(String(value));
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function getFileLabel(url) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    return segments.at(-1) || parsed.hostname;
  } catch {
    return String(url);
  }
}

function isImageAttachment(attachment) {
  const type = String(attachment?.type || "").toLowerCase();
  const url = String(attachment?.url || "").toLowerCase();

  if (type.startsWith("image/")) {
    return true;
  }

  return /\.(png|jpe?g|gif|webp|svg)(\?|$)/.test(url);
}
