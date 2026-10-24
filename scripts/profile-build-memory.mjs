import { mkdtemp, readdir, stat, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { renderSite } from "../src/renderSite.js";

// Use fresh processes for comparable high-water RSS. Synthetic input follows
// the saved normalized snapshot shape, with four 1-KiB publications per day.
const mode = process.argv[2] || "200";
const real = mode === "real";
const pages = Number(mode);
if (!real && ![200, 2000].includes(pages)) throw new Error("Expected 200, 2000 or real");
const root = await mkdtemp(join(tmpdir(), "hnf-memory-profile-"));
const distDir = join(root, "dist");
const now = new Date("2026-10-24T12:00:00Z");
let result;
try {
  if (real) {
    result = await renderSite({ distDir, now, writePages: true, logger: message => console.error(message) });
  } else {
    const items = [];
    for (let day = 0; day < pages / 2; day++) {
      const displayDate = new Date(now.getTime() - day * 86400000).toISOString();
      for (let entry = 0; entry < 4; entry++) items.push({ id: `${day}-${entry}`, title: `Post ${day}-${entry}`, link: `https://example.test/${day}/${entry}`, displayDate, summaryText: "x".repeat(1024) });
    }
    result = await renderSite({
      distDir, now, writePages: true,
      sourceRowsPayload: { urls: [] }, validationsPayload: [],
      normalizedPayload: { summary: { sourceRows: 1, validFeeds: 1, parsedFeeds: 1, emptyFeeds: 0, failedFeeds: 0 }, feeds: [{ id: "profile", spaceName: "Synthetic profile", country: "Germany", items }], failures: [] },
      calendarPayload: { events: [], items: [] },
    });
  }
  const output = await inspectOutput(distDir);
  if (real) {
    const events = JSON.parse(await readFile(join(distDir, "calendar/events.json"), "utf8"));
    if (events.items.some(item => "events" in item || "rawIcsText" in item)) throw new Error("Nested calendar payload");
    if (events.events.some(event => Array.from(event.description || "").length > 1095)) throw new Error("Description limit");
  }
  console.log(JSON.stringify({ kind: real ? "real-snapshot-render" : "synthetic-render", requestedNewsPages: real ? null : pages, pageCount: result.pageCount, pagesReturned: "pages" in result, ...output, peakRssMiB: process.resourceUsage().maxRSS / 1024 }));
} finally {
  await rm(root, { recursive: true, force: true });
}

// Summation retains paths transiently, never reads all generated HTML strings.
async function inspectOutput(directory) {
  let files = 0;
  let outputBytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await inspectOutput(path);
      files += nested.files;
      outputBytes += nested.outputBytes;
    } else {
      files++;
      outputBytes += (await stat(path)).size;
    }
  }
  return { files, outputBytes };
}
