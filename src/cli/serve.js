import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

import { PATHS } from "../config.js";

const port = Number(process.env.PORT || 4173);

async function main() {
  const server = createServer(async (_request, response) => {
    try {
      const html = await readFile(PATHS.htmlOutput, "utf8");
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(html);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Build output not found. Run `npm run build` first.\n");
    }
  });

  server.listen(port, () => {
    console.log(`Serving ${PATHS.htmlOutput} at http://127.0.0.1:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
