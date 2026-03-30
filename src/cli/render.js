import { DIST_DIR } from "../config.js";
import { renderSite } from "../renderSite.js";

async function main() {
  const startedAt = Date.now();
  const result = await renderSite({ writePages: true, logger: console.log });
  const elapsedMs = Date.now() - startedAt;

  console.log(`Rendered ${Object.keys(result.pages).length} pages into ${DIST_DIR}`);
  console.log(`Rendered ${Object.keys(result.pages).length} pages in ${elapsedMs}ms`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
