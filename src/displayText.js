import { load } from "cheerio";

const MAX_CONTENT_LENGTH = 500;

export function selectDisplayText(item) {
  const contentCandidates = Array.isArray(item?.contentCandidates) ? item.contentCandidates : [];
  for (const candidate of contentCandidates) {
    const picked = readContentCandidate(candidate);
    if (!picked) {
      continue;
    }

    const truncated = truncateSelectedDisplayValue(picked.value, picked.format);
    return {
      text: truncated.text,
      wasTruncated: truncated.wasTruncated,
      format: truncated.format,
      sourceField: picked.field,
    };
  }

  const summaryCandidates = Array.isArray(item?.summaryCandidates) ? item.summaryCandidates : [];
  for (const candidate of summaryCandidates) {
    const picked = readSummaryCandidate(candidate);
    if (picked) {
      const truncated = truncateSelectedDisplayValue(picked.value, picked.format);
      return {
        text: truncated.text,
        wasTruncated: truncated.wasTruncated,
        format: truncated.format,
        sourceField: picked.field,
      };
    }
  }

  return {
    text: null,
    wasTruncated: false,
    format: null,
    sourceField: null,
  };
}

export function selectItemDisplayContent(item) {
  const persisted = normalizePersistedDisplayContent(item?.displayContent);
  if (persisted) {
    return persisted;
  }

  return selectDisplayText(extractDisplayCandidates(item));
}

function normalizePersistedDisplayContent(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const text = typeof value.text === "string" ? value.text : null;
  if (!text) {
    return null;
  }

  return {
    text,
    wasTruncated: Boolean(value.wasTruncated),
    format: value.format === "html" ? "html" : "text",
    sourceField: typeof value.sourceField === "string" ? value.sourceField : null,
  };
}

function extractDisplayCandidates(item) {
  const observed = item?.observed;

  return {
    summaryCandidates: Array.isArray(observed?.summaryCandidates)
      ? observed.summaryCandidates
      : Array.isArray(item?.summaryCandidates)
        ? item.summaryCandidates
        : [],
    contentCandidates: Array.isArray(observed?.contentCandidates)
      ? observed.contentCandidates
      : Array.isArray(item?.contentCandidates)
        ? item.contentCandidates
        : [],
  };
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

function truncateSelectedDisplayValue(value, format) {
  if (format === "html") {
    const plainText = stripHtml(value);
    const truncated = truncatePlainText(plainText, MAX_CONTENT_LENGTH);

    if (truncated.wasTruncated) {
      const html = truncateHtml(value, MAX_CONTENT_LENGTH);
      if (html) {
        return {
          text: html,
          wasTruncated: true,
          format: "html",
        };
      }

      return {
        text: truncated.text,
        wasTruncated: true,
        format: "text",
      };
    }

    return {
      text: value,
      wasTruncated: false,
      format: "html",
    };
  }

  return {
    ...truncatePlainText(value, MAX_CONTENT_LENGTH),
    format: "text",
  };
}

function readContentCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const field = typeof candidate.field === "string" ? candidate.field : null;
  const html = cleanCandidateHtml(candidate.html);
  if (html) {
    return { value: html, format: "html", field };
  }

  const text = cleanCandidateText(candidate.text);
  if (text) {
    return { value: text, format: "text", field };
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

function truncateHtml(value, limit) {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  const $ = load(`<div id="root">${value}</div>`, null, false);
  const root = $("#root");
  const state = {
    remaining: limit,
    wasTruncated: false,
  };

  truncateHtmlNodes(root.contents().toArray(), state, $);
  removeEmptyHtmlNodes(root, $);

  const html = root.html()?.trim();
  return html || undefined;
}

function truncateHtmlNodes(nodes, state, $) {
  for (const node of nodes) {
    if (state.remaining <= 0) {
      $(node).remove();
      state.wasTruncated = true;
      continue;
    }

    truncateHtmlNode(node, state, $);
  }
}

function truncateHtmlNode(node, state, $) {
  if (!node) {
    return;
  }

  if (node.type === "text") {
    truncateHtmlTextNode(node, state);
    return;
  }

  if (!Array.isArray(node.children) || node.children.length === 0) {
    return;
  }

  truncateHtmlNodes([...node.children], state, $);
}

function truncateHtmlTextNode(node, state) {
  const text = typeof node.data === "string" ? node.data : "";
  if (!text) {
    return;
  }

  if (text.length <= state.remaining) {
    state.remaining -= text.length;
    return;
  }

  const truncated = truncatePlainText(text, state.remaining);
  node.data = truncated.text;
  state.remaining = 0;
  state.wasTruncated = true;
}

function removeEmptyHtmlNodes(root, $) {
  root.find("*").each((_, element) => {
    if (isVoidHtmlTag(element.tagName)) {
      return;
    }

    const hasChildren = Array.isArray(element.children) && element.children.length > 0;
    if (hasChildren) {
      return;
    }

    const text = $(element).text();
    if (!text.trim()) {
      $(element).remove();
    }
  });
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

function isVoidHtmlTag(tagName) {
  return ["br", "hr", "img", "input", "meta", "link"].includes(String(tagName || "").toLowerCase());
}

function stripHtml(value) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
