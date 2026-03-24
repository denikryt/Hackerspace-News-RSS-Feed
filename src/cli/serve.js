import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { DIST_DIR } from "../config.js";

const DEFAULT_PORT = Number(process.env.PORT || 8090);

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

export function createPreviewServer({ distDir = DIST_DIR, readFileImpl = readFile } = {}) {
  return createServer(async (request, response) => {
    let resolvedPath;

    try {
      resolvedPath = resolvePreviewPath({
        distDir,
        urlPath: request.url || "/",
      });
    } catch {
      respondNotFound(response);
      return;
    }

    try {
      const body = await readFileImpl(resolvedPath);
      response.writeHead(200, { "content-type": getContentType(resolvedPath) });
      response.end(body);
    } catch (error) {
      if (isNotFoundError(error)) {
        respondNotFound(response);
        return;
      }

      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("Internal server error while reading build output.\n");
    }
  });
}

export function startPreviewServer({ port = DEFAULT_PORT, distDir = DIST_DIR, readFileImpl = readFile } = {}) {
  const server = createPreviewServer({ distDir, readFileImpl });
  server.listen(port, () => {
    console.log(`Serving ${distDir} at http://127.0.0.1:${port}`);
  });
  return server;
}

export function resolvePreviewPath({ distDir = DIST_DIR, urlPath }) {
  const pathname = decodeURIComponent(new URL(urlPath, "http://127.0.0.1").pathname);
  const relativePath = normalizeRequestPath(pathname);
  const absolutePath = resolve(distDir, relativePath);
  const distRelativePath = relative(distDir, absolutePath);

  if (
    distRelativePath === "" ||
    distRelativePath === ".." ||
    distRelativePath.startsWith(`..${sep}`) ||
    distRelativePath.includes(`${sep}..${sep}`) ||
    distRelativePath.startsWith("..")
  ) {
    throw new Error("Path traversal outside dist is not allowed");
  }

  return absolutePath;
}

export function normalizeRequestPath(pathname) {
  if (pathname === "/" || pathname === "") {
    return "index.html";
  }

  const cleanPath = pathname.replace(/^\/+/, "");
  if (!cleanPath) {
    return "index.html";
  }

  if (cleanPath.endsWith("/")) {
    return `${cleanPath}index.html`;
  }

  if (extname(cleanPath)) {
    return cleanPath;
  }

  return `${cleanPath}/index.html`;
}

export function getContentType(filePath) {
  return CONTENT_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";
}

function respondNotFound(response) {
  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("Build output not found. Run `npm run build` first.\n");
}

function isNotFoundError(error) {
  return error && typeof error === "object" && "code" in error && error.code === "ENOENT";
}

async function main() {
  startPreviewServer();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
