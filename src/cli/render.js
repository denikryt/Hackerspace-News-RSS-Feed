import { DIST_DIR } from "../config.js";
import { renderSite } from "../renderSite.js";

async function main() {
  const startedAt = Date.now();
  const result = await renderSite({ writePages: true });
  const elapsedMs = Date.now() - startedAt;

  Object.keys(result.pages).forEach((relativePath) => {
    console.log(`Wrote ${DIST_DIR}/${relativePath}`);
  });
  console.log(`Rendered ${Object.keys(result.pages).length} pages in ${elapsedMs}ms`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
