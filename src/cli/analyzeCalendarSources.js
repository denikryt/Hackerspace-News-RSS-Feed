import { resolve } from "node:path";

import { analyzeCalendarSources } from "../calendarSourceAnalysis.js";
import { PATHS } from "../config.js";
import { readJson, writeJson, writeText } from "../storage.js";

const ANALYSIS_DIR = resolve(process.cwd(), "analysis");
const DEFAULT_ARTIFACT_PATHS = {
  jsonReport: resolve(ANALYSIS_DIR, "calendar_source_inventory.json"),
  markdownReport: resolve(ANALYSIS_DIR, "calendar_source_inventory.md"),
};

export async function runAnalyzeCalendarSourcesCli({
  argv = process.argv.slice(2),
  analyzeImpl = analyzeCalendarSources,
  artifactPaths = DEFAULT_ARTIFACT_PATHS,
  fetchImpl = fetch,
  logger = console.log,
  paths = PATHS,
  readJsonImpl = readJson,
  writeJsonImpl = writeJson,
  writeTextImpl = writeText,
} = {}) {
  if (argv.includes("--help")) {
    logger("Usage: npm run analyze:calendar-sources");
    return;
  }

  logger("[analyze] starting calendar source analysis");
  const report = await analyzeImpl({
    calendarSourcesPath: paths.calendarSources,
    fetchImpl,
    readJsonImpl,
    logger,
  });

  logger("[analyze] writing calendar source analysis artifacts");
  await Promise.all([
    writeJsonImpl(artifactPaths.jsonReport, report),
    writeTextImpl(artifactPaths.markdownReport, renderCalendarSourceInventoryMarkdown(report)),
  ]);

  logger(`[analyze] analyzed ${report.summary.totalSources} calendar sources`);
  logger(`[analyze] parsed ${report.summary.totalEvents} calendar events`);
  logger(`[analyze] wrote ${artifactPaths.jsonReport}`);
  logger(`[analyze] wrote ${artifactPaths.markdownReport}`);

  return report;
}

function renderCalendarSourceInventoryMarkdown(report) {
  const lines = [
    "# Calendar Source Inventory",
    "",
    `- Generated at: ${report.generatedAt}`,
    `- Total sources: ${report.summary.totalSources}`,
    `- Parsed sources: ${report.summary.parsedSources}`,
    `- Failed sources: ${report.summary.failedSources}`,
    `- Total events: ${report.summary.totalEvents}`,
    "",
    "## Property Presence",
    "",
  ];

  if (!Array.isArray(report.propertyPresence) || report.propertyPresence.length === 0) {
    lines.push("- None");
  } else {
    report.propertyPresence.forEach((entry) => {
      lines.push(`- \`${entry.name}\`: ${entry.count}`);
    });
  }

  lines.push("", "## DTSTART Encodings", "");
  lines.push(`- utc: ${report.dtstartEncodings.utc}`);
  lines.push(`- zoned: ${report.dtstartEncodings.zoned}`);
  lines.push(`- date: ${report.dtstartEncodings.date}`);
  lines.push(`- floating: ${report.dtstartEncodings.floating}`);

  lines.push("", "## Time Zones", "");
  if (!Array.isArray(report.timeZones) || report.timeZones.length === 0) {
    lines.push("- None");
  } else {
    report.timeZones.forEach((entry) => {
      lines.push(`- \`${entry.name}\`: ${entry.count}`);
    });
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  await runAnalyzeCalendarSourcesCli();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
