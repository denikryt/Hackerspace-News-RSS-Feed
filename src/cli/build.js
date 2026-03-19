import { buildDataset } from "../buildDataset.js";
import { DIST_DIR, PATHS } from "../config.js";
import { writeJson, writeText } from "../storage.js";
import { resolve } from "node:path";

async function main() {
  const result = await buildDataset();

  await writeJson(PATHS.sourceRows, result.sourceRowsPayload);
  await writeJson(PATHS.validations, result.validationsPayload);
  await writeJson(PATHS.normalizedFeeds, result.normalizedPayload);
  await Promise.all(
    Object.entries(result.site.pages).map(([relativePath, html]) =>
      writeText(resolve(DIST_DIR, relativePath), html),
    ),
  );

  console.log(`Wrote ${PATHS.sourceRows}`);
  console.log(`Wrote ${PATHS.validations}`);
  console.log(`Wrote ${PATHS.normalizedFeeds}`);
  Object.keys(result.site.pages).forEach((relativePath) => {
    console.log(`Wrote dist/${relativePath}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
