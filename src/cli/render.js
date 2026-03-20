import { DIST_DIR } from "../config.js";
import { renderSite } from "../renderSite.js";

async function main() {
  const result = await renderSite({ writePages: true });

  Object.keys(result.pages).forEach((relativePath) => {
    console.log(`Wrote ${DIST_DIR}/${relativePath}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
