import { DIST_DIR, PATHS } from "../config.js";
import { refreshDataset } from "../refreshDataset.js";
import { renderSite } from "../renderSite.js";

async function main() {
  const refreshResult = await refreshDataset({ writeSnapshots: true });
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
  Object.keys(renderResult.pages).forEach((relativePath) => {
    console.log(`Wrote ${DIST_DIR}/${relativePath}`);
  });
  console.log(`Rendered ${Object.keys(renderResult.pages).length} pages in ${renderElapsedMs}ms`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
