const EXCLUDED_PATHS = new Set(["news/index.html", "authors/index.html", "sitemap.xml", "robots.txt"]);

export function pagePathToUrl(relativePath, siteUrl) {
  if (EXCLUDED_PATHS.has(relativePath)) return null;
  if (!relativePath.endsWith(".html") && !relativePath.endsWith("/")) return null;

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

export function buildSitemapXml(pagePaths, siteUrl) {
  const urls = pagePaths
    .map((p) => pagePathToUrl(p, siteUrl))
    .filter(Boolean)
    .map((loc) => `  <url><loc>${loc}</loc></url>`)
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    (urls ? `${urls}\n` : "") +
    `</urlset>`
  );
}

export function buildRobotsTxt(siteUrl) {
  const base = siteUrl.replace(/\/$/, "");
  return `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`;
}
