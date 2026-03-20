import { DIST_DIR, PATHS } from "../config.js";
import { refreshDataset } from "../refreshDataset.js";
import { renderSite } from "../renderSite.js";

async function main() {
  const refreshResult = await refreshDataset({ writeSnapshots: true });
  const renderResult = await renderSite({
    sourceRowsPayload: refreshResult.sourceRowsPayload,
    validationsPayload: refreshResult.validationsPayload,
    normalizedPayload: refreshResult.normalizedPayload,
    writePages: true,
  });

  console.log(`Wrote ${PATHS.sourceRows}`);
  console.log(`Wrote ${PATHS.validations}`);
  console.log(`Wrote ${PATHS.normalizedFeeds}`);
  Object.keys(renderResult.pages).forEach((relativePath) => {
    console.log(`Wrote ${DIST_DIR}/${relativePath}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
