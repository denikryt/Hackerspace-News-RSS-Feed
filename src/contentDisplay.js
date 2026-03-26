import { load } from "cheerio";

import { escapeHtml } from "./renderers/layout.js";
import { selectDisplayText, selectItemDisplayContent } from "./displayText.js";

export { selectDisplayText } from "./displayText.js";

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

export function renderDisplayContent(item) {
  const display = selectItemDisplayContent(item);
  const attachments = normalizeDisplayAttachments(item.attachments);
  const body = renderDisplayBody(display);
  const attachmentsHtml = renderAttachments(attachments);

  return [body, attachmentsHtml].filter(Boolean).join("");
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
  if (!display?.text) {
    return "";
  }

  if (display.format === "html") {
    const sanitized = sanitizeContentHtml(display.text);
    if (sanitized) {
      return `<div class="content-body rich-html">${sanitized}</div>`;
    }

    const plain = stripHtml(display.text);
    if (plain) {
      return `<div class="content-body plain-text">${escapeHtml(plain)}</div>`;
    }

    return "";
  }

  return `<div class="content-body plain-text">${escapeHtml(display.text)}</div>`;
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

function normalizeDisplayAttachments(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return [];
  }

  return attachments
    .filter((attachment) => attachment?.url && isSafeUrl(attachment.url))
    .map((attachment) => ({
      url: attachment.url,
      type: attachment.type || undefined,
      label: attachment.title || attachment.label || getFileLabel(attachment.url),
    }));
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
