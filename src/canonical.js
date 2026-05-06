const REDIRECT_ONLY_PATHS = new Set(["news/index.html"]);

// Canonical URLs are derived from the final output path so every rendered HTML
// page points search engines at one stable public URL shape.
export function pagePathToCanonicalUrl(relativePath, siteUrl) {
  if (REDIRECT_ONLY_PATHS.has(relativePath)) {
    return null;
  }
  if (!relativePath.endsWith(".html")) {
    return null;
  }

  const base = siteUrl.replace(/\/$/, "");

  if (relativePath === "index.html") {
    return `${base}/`;
  }

  if (relativePath.endsWith("/index.html")) {
    const dir = relativePath.slice(0, -"index.html".length);
    return `${base}/${dir}`;
  }

  return `${base}/${relativePath}`;
}

// Canonical links are injected after the page renderer finishes so every HTML
// renderer shares the same rule, including pages that write a full document
// without going through the common layout helper.
export function injectCanonicalHref(html, canonicalHref) {
  if (!canonicalHref || typeof html !== "string" || html.includes('rel="canonical"')) {
    return html;
  }
  if (!html.includes("</head>")) {
    return html;
  }

  return html.replace(
    "</head>",
    `    <link rel="canonical" href="${escapeHtmlAttribute(canonicalHref)}" />\n  </head>`,
  );
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
