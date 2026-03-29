import { analyzeWikiDiscoveryUnmatchedResponses } from "../wikiDiscoveryUnmatchedResponseComparison.js";

const HELP_LINES = [
  "Usage: npm run analyze:wiki-discovery-unmatched -- [--attempt-count=N] [--retry-delays-ms=MS,...] [--attempt-timeouts-ms=MS,...]",
  "Defaults: three attempts, timeouts 1000/2000/3000ms, retry delays 1000/2000ms.",
];

export function parseAnalyzeWikiDiscoveryUnmatchedResponsesArgs(argv = []) {
  return {
    attemptCount: readNumericArg(argv, "--attempt-count"),
    retryDelaysMs: readScheduleArg(argv, "--retry-delays-ms"),
    attemptTimeoutsMs: readScheduleArg(argv, "--attempt-timeouts-ms"),
  };
}

export async function runAnalyzeWikiDiscoveryUnmatchedResponsesCli({
  argv = process.argv.slice(2),
  logger = console.log,
  analyzeImpl = analyzeWikiDiscoveryUnmatchedResponses,
} = {}) {
  if (argv.includes("--help") || argv.includes("-h")) {
    for (const line of HELP_LINES) {
      logger(line);
    }
    return;
  }

  const options = parseAnalyzeWikiDiscoveryUnmatchedResponsesArgs(argv);

  logger("[analyze] starting unmatched wiki/discovery response comparison");

  const result = await analyzeImpl({
    writeArtifact: true,
    logger,
    ...options,
  });

  logger(`Compared ${result.summary.unmatchedPairs} unmatched wiki/discovery pairs`);
  logger(`Same feed content ${result.summary.sameFeedContent}`);
  logger(`Different feed content ${result.summary.differentFeedContent}`);
  logger(`Non-XML or unparseable ${result.summary.nonXmlOrUnparseableResponse}`);
  logger("Wrote analysis/wiki_discovery_unmatched_response_comparison.json");
}

async function main() {
  await runAnalyzeWikiDiscoveryUnmatchedResponsesCli();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

function readNumericArg(argv, flagName) {
  const rawValue = readFlagValue(argv, flagName);
  if (rawValue === undefined) {
    return undefined;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function readScheduleArg(argv, flagName) {
  const rawValue = readFlagValue(argv, flagName);
  if (rawValue === undefined) {
    return undefined;
  }

  const values = rawValue
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((value) => Number.isFinite(value));

  return values.length > 0 ? values : undefined;
}

function readFlagValue(argv, flagName) {
  const prefix = `${flagName}=`;
  const matchingArg = argv.find((arg) => arg.startsWith(prefix));
  return matchingArg ? matchingArg.slice(prefix.length) : undefined;
}
