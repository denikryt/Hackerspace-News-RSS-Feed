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
 * @returns {Object} { text: string|null, wasTruncated: boolean, format: "text"|"html"|null, sourceField: string|null }
 */
export function selectDisplayText(item) {
  const summaryCandidates = Array.isArray(item?.summaryCandidates) ? item.summaryCandidates : [];
  for (const candidate of summaryCandidates) {
    const picked = readSummaryCandidate(candidate);
    if (picked) {
      return {
        text: picked.value,
        wasTruncated: false,
        format: picked.format,
        sourceField: picked.field,
      };
    }
  }

  const contentCandidates = Array.isArray(item?.contentCandidates) ? item.contentCandidates : [];
  for (const candidate of contentCandidates) {
    const picked = readContentCandidate(candidate);
    if (!picked) {
      continue;
    }

    const truncated = truncatePlainText(picked.value, MAX_CONTENT_LENGTH);
    return {
      text: truncated.text,
      wasTruncated: truncated.wasTruncated,
      format: "text",
      sourceField: picked.field,
    };
  }

  return { text: null, wasTruncated: false, format: null, sourceField: null };
}

function readSummaryCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const field = typeof candidate.field === "string" ? candidate.field : null;
  const html = cleanCandidateHtml(candidate.html);
  const text = cleanCandidateText(candidate.text);

  if (html) {
    return { value: html, format: "html", field };
  }

  if (text) {
    return { value: text, format: "text", field };
  }

  return null;
}

function readContentCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const field = typeof candidate.field === "string" ? candidate.field : null;
  const text = cleanCandidateText(candidate.text);
  if (text) {
    return { value: text, field };
  }

  const html = cleanCandidateHtml(candidate.html);
  if (html) {
    const plain = stripHtml(html);
    if (plain) {
      return { value: plain, field };
    }
  }

  return null;
}

function cleanCandidateText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function cleanCandidateHtml(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function truncatePlainText(value, limit) {
  if (typeof value !== "string" || !value) {
    return { text: "", wasTruncated: false };
  }

  if (value.length <= limit) {
    return { text: value, wasTruncated: false };
  }

  let safeIndex = adjustIndexForSurrogates(value, limit);
  let truncated = value.slice(0, safeIndex);

  const whitespaceIndex = findLastWhitespace(truncated);
  if (whitespaceIndex > 0) {
    truncated = truncated.slice(0, whitespaceIndex);
  }

  truncated = truncated.replace(/\s+$/u, "");

  if (truncated.length === 0) {
    truncated = value.slice(0, safeIndex);
  }

  truncated = removeTrailingHighSurrogate(truncated);

  return { text: truncated + "…", wasTruncated: true };
}

function adjustIndexForSurrogates(value, index) {
  if (index <= 0 || index >= value.length) {
    return index;
  }

  const prevCode = value.charCodeAt(index - 1);
  const currentCode = value.charCodeAt(index);
  if (isHighSurrogate(prevCode) && isLowSurrogate(currentCode)) {
    return index - 1;
  }

  return index;
}

function removeTrailingHighSurrogate(value) {
  if (!value) {
    return value;
  }

  const lastCode = value.charCodeAt(value.length - 1);
  if (isHighSurrogate(lastCode)) {
    return value.slice(0, -1);
  }
  return value;
}

function findLastWhitespace(value) {
  for (let index = value.length - 1; index >= 0; index -= 1) {
    if (isWhitespace(value[index])) {
      return index;
    }
  }
  return -1;
}

function isWhitespace(char) {
  return /\s/.test(char || "");
}

function isHighSurrogate(code) {
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code) {
  return code >= 0xdc00 && code <= 0xdfff;
}

function stripHtml(value) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function renderDisplayContent(item) {
  const candidates = extractCandidateSources(item);
  const display = selectDisplayText(candidates);
  const attachments = normalizeDisplayAttachments(item.attachments);
  const body = renderDisplayBody(display);
  const attachmentsHtml = renderAttachments(attachments);

  return [body, attachmentsHtml].filter(Boolean).join("");
}

function extractCandidateSources(item) {
  const observed = item?.observed;
  const summaryCandidates = Array.isArray(observed?.summaryCandidates)
    ? observed.summaryCandidates
    : Array.isArray(item?.summaryCandidates)
      ? item.summaryCandidates
      : [];
  const contentCandidates = Array.isArray(observed?.contentCandidates)
    ? observed.contentCandidates
    : Array.isArray(item?.contentCandidates)
      ? item.contentCandidates
      : [];

  return { summaryCandidates, contentCandidates };
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
