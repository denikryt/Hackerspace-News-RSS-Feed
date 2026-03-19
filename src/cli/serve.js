import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { DIST_DIR } from "../config.js";

const port = Number(process.env.PORT || 4173);

async function main() {
  const server = createServer(async (request, response) => {
    try {
      const requestPath = normalizeRequestPath(request.url || "/");
      const html = await readFile(resolve(DIST_DIR, requestPath), "utf8");
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(html);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Build output not found. Run `npm run build` first.\n");
    }
  });

  server.listen(port, () => {
    console.log(`Serving ${DIST_DIR} at http://127.0.0.1:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function normalizeRequestPath(urlPath) {
  const cleanPath = urlPath.split("?")[0];

  if (cleanPath === "/" || cleanPath === "") {
    return "index.html";
  }

  if (cleanPath.endsWith("/")) {
    return `${cleanPath.slice(1)}index.html`;
  }

  return cleanPath.replace(/^\//, "");
}
