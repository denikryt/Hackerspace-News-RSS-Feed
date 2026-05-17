import { PATHS } from "../config.js";
import { refreshDataset } from "../refreshDataset.js";
import { readJson } from "../storage.js";

export async function runRefreshCli({
  argv = process.argv.slice(2),
  refreshImpl = refreshDataset,
  readJsonImpl = readJson,
  logger = console.log,
  paths = PATHS,
  env = process.env,
} = {}) {
  if (hasCliFlag({ argv, env, flag: "--help" })) {
    logger("Usage: npm run refresh -- [--include-discovery-valid] [--calendar]");
    return;
  }

  const refreshCalendarOnly = hasCliFlag({ argv, env, flag: "--calendar" });
  const additionalSourceRows = await loadDiscoveryValidSourceRows({ argv, env, readJsonImpl, paths });

  await refreshImpl({
    writeSnapshots: true,
    logger,
    additionalSourceRows,
    refreshCalendarOnly,
  });

  logger("Refresh completed. Reporting snapshot artifacts.");
  if (!refreshCalendarOnly) {
    logger(`Wrote ${paths.sourceRows}`);
    logger(`Wrote ${paths.validations}`);
    logger(`Wrote ${paths.normalizedFeeds}`);
  }
  if (paths.calendarEvents) {
    logger(`Wrote ${paths.calendarEvents}`);
  }
  if (paths.calendarIndex) {
    logger(`Wrote ${paths.calendarIndex}`);
  }
}

async function loadDiscoveryValidSourceRows({ argv, env, readJsonImpl, paths }) {
  if (!hasCliFlag({ argv, env, flag: "--include-discovery-valid" })) {
    return [];
  }

  const payload = await readJsonImpl(paths.discoveredValidSourceRows);
  return Array.isArray(payload?.urls) ? payload.urls : [];
}

// npm run foo --bar often exposes flags through npm_config_* instead of argv,
// so the CLI accepts both forms to avoid surprising no-op runs.
function hasCliFlag({ argv, env, flag }) {
  if (Array.isArray(argv) && argv.includes(flag)) {
    return true;
  }

  const envKey = toNpmConfigFlagKey(flag);
  if (!envKey) {
    return false;
  }

  return isTruthyNpmConfigValue(env?.[envKey]);
}

function toNpmConfigFlagKey(flag) {
  if (typeof flag !== "string" || !flag.startsWith("--")) {
    return null;
  }

  return `npm_config_${flag.slice(2).replaceAll("-", "_")}`;
}

function isTruthyNpmConfigValue(value) {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized !== "" && normalized !== "false" && normalized !== "0";
}

async function main() {
  await runRefreshCli();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
