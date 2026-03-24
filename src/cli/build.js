import { DIST_DIR, PATHS } from "../config.js";
import { refreshDataset } from "../refreshDataset.js";
import { renderSite } from "../renderSite.js";

async function main() {
  const refreshResult = await refreshDataset({ writeSnapshots: true, logger: console.log });
  console.log("Refresh completed. Starting site render.");
  const renderStartedAt = Date.now();
  const renderResult = await renderSite({
    sourceRowsPayload: refreshResult.sourceRowsPayload,
    validationsPayload: refreshResult.validationsPayload,
    normalizedPayload: refreshResult.normalizedPayload,
    writePages: true,
  });
  const renderElapsedMs = Date.now() - renderStartedAt;

  console.log(`Wrote ${PATHS.sourceRows}`);
  console.log(`Wrote ${PATHS.validations}`);
  console.log(`Wrote ${PATHS.normalizedFeeds}`);
  console.log(`Rendered ${Object.keys(renderResult.pages).length} pages into ${DIST_DIR}`);
  console.log(`Rendered ${Object.keys(renderResult.pages).length} pages in ${renderElapsedMs}ms`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
