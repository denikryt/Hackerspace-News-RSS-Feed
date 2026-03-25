import { load } from "cheerio";

import { escapeHtml } from "./renderers/layout.js";

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

const MAX_CONTENT_LENGTH = 500;

/**
 * Select display text from item candidates with priority and truncation.
 * @param {Object} item - Item with summaryCandidates and contentCandidates
 * @returns {Object} { text: string|null, wasTruncated: boolean }
 */
export function selectDisplayText(item) {
  // Try summary candidates first (preferred, untruncated)
  if (Array.isArray(item.summaryCandidates)) {
    for (const candidate of item.summaryCandidates) {
      const text = getTextFromCandidate(candidate);
      if (text) {
        return { text, wasTruncated: false };
      }
    }
  }

  // Fall back to content candidates (truncate if needed)
  if (Array.isArray(item.contentCandidates)) {
    for (const candidate of item.contentCandidates) {
      const text = getTextFromCandidate(candidate);
      if (text) {
        if (text.length > MAX_CONTENT_LENGTH) {
          return {
            text: text.slice(0, MAX_CONTENT_LENGTH) + "…",
            wasTruncated: true,
          };
        }
        return { text, wasTruncated: false };
      }
    }
  }

  return { text: null, wasTruncated: false };
}

/**
 * Extract text from a candidate object (prefers text field).
 * @param {Object} candidate - Candidate with optional text and html fields
 * @returns {string|null} Text content or null if empty
 */
function getTextFromCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  // Prefer text field
  if (candidate.text && typeof candidate.text === "string" && candidate.text.trim()) {
    return candidate.text;
  }

  // Fall back to HTML if no text
  if (candidate.html && typeof candidate.html === "string" && candidate.html.trim()) {
    return candidate.html;
  }

  return null;
}

export function buildDisplayContent(item) {
  const attachments = normalizeDisplayAttachments(item.attachments);

  // Prefer using candidates if available (provides truncation via selectDisplayText)
  if (item.observed?.summaryCandidates || item.observed?.contentCandidates) {
    const display = selectDisplayText({
      summaryCandidates: item.observed.summaryCandidates,
      contentCandidates: item.observed.contentCandidates,
    });

    if (display.text) {
      // Determine render mode based on whether text looks like HTML
      const isHtml = display.text && /<[^>]+>/.test(display.text);
      const sanitized = isHtml ? sanitizeContentHtml(display.text) : undefined;

      if (sanitized) {
        return {
          renderMode: "html",
          html: sanitized,
          attachments,
        };
      }

      return {
        renderMode: "text",
        text: display.text,
        attachments,
      };
    }

    return {
      renderMode: attachments.length > 0 ? "attachments" : "empty",
      attachments,
    };
  }

  // Fallback to pre-selected fields for backward compatibility
  const sanitizedHtml = sanitizeContentHtml(item.contentHtml || item.summaryHtml);

  if (sanitizedHtml) {
    return {
      renderMode: "html",
      html: sanitizedHtml,
      attachments,
    };
  }

  const text = normalizeText(item.contentText || item.summaryText || item.summary);

  if (text) {
    return {
      renderMode: "text",
      text,
      attachments,
    };
  }

  return {
    renderMode: attachments.length > 0 ? "attachments" : "empty",
    attachments,
  };
}

export function renderDisplayContent(item) {
  const display = buildDisplayContent(item);
  const body = renderDisplayBody(display);
  const attachments = renderAttachments(display.attachments);

  return [body, attachments].filter(Boolean).join("");
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
