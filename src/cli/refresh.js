import { PATHS } from "../config.js";
import { refreshDataset } from "../refreshDataset.js";

async function main() {
  await refreshDataset({ writeSnapshots: true, logger: console.log });

  console.log(`Wrote ${PATHS.sourceRows}`);
  console.log(`Wrote ${PATHS.validations}`);
  console.log(`Wrote ${PATHS.normalizedFeeds}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
