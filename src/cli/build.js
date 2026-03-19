import { buildDataset } from "../buildDataset.js";
import { PATHS } from "../config.js";
import { writeJson, writeText } from "../storage.js";

async function main() {
  const result = await buildDataset();

  await writeJson(PATHS.sourceRows, result.sourceRowsPayload);
  await writeJson(PATHS.validations, result.validationsPayload);
  await writeJson(PATHS.normalizedFeeds, result.normalizedPayload);
  await writeText(PATHS.htmlOutput, result.html);

  console.log(`Wrote ${PATHS.sourceRows}`);
  console.log(`Wrote ${PATHS.validations}`);
  console.log(`Wrote ${PATHS.normalizedFeeds}`);
  console.log(`Wrote ${PATHS.htmlOutput}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
