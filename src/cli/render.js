import { DIST_DIR } from "../config.js";
import { renderSite } from "../renderSite.js";

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2)
      .filter((a) => a.startsWith("--"))
      .map((a) => a.slice(2).split("=")),
  );
  const layout = args.layout ?? "newspaper";

  const startedAt = Date.now();
  const result = await renderSite({ writePages: true, logger: console.log, layout });
  const elapsedMs = Date.now() - startedAt;

  console.log(`Rendered ${Object.keys(result.pages).length} pages into ${DIST_DIR}`);
  console.log(`Rendered ${Object.keys(result.pages).length} pages in ${elapsedMs}ms`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
