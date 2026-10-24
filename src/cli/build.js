import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readResourceLimits } from "../resourceLimits.js";

// Each stage owns its address space and exchanges only persisted snapshots.
// A failure or parent signal ends the chain before the next child is created.
export async function runBuildCli({
  argv = process.argv.slice(2),
  env = process.env,
  logger = console.log,
  runStageImpl,
  signalSource = process,
} = {}) {
  if (argv.includes("--help")) {
    logger("Usage: npm run build -- [--include-discovery-valid]");
    return;
  }
  readResourceLimits(env);
  const controller = new AbortController();
  const interrupt = () => controller.abort("SIGINT");
  const terminate = () => controller.abort("SIGTERM");
  signalSource.on("SIGINT", interrupt);
  signalSource.on("SIGTERM", terminate);
  const runStage = runStageImpl ?? ((stage, args) => runNodeStage(stage, args, { env, signal: controller.signal }));
  const discoveryValue = String(env.npm_config_include_discovery_valid ?? "").trim().toLowerCase();
  const includeDiscovery = argv.includes("--include-discovery-valid") || !["", "0", "false"].includes(discoveryValue);

  try {
    for (const [stage, args] of [
      ["refresh", includeDiscovery ? ["--include-discovery-valid"] : []],
      ["refreshCurated", []],
      ["render", []],
    ]) {
      if (controller.signal.aborted) throw stageFailure(stage, null, controller.signal.reason);
      await runStage(stage, args);
      if (controller.signal.aborted) throw stageFailure(stage, null, controller.signal.reason);
      if (stage === "refreshCurated") logger("Curated refresh completed. Starting site render.");
    }
  } finally {
    signalSource.removeListener("SIGINT", interrupt);
    signalSource.removeListener("SIGTERM", terminate);
  }
}

// Await close, not exit, so a child has released its stdio before advancing.
// Forward parent signals to the active child and still await its termination.
export function runNodeStage(stage, args, { env = process.env, signal, spawnImpl = spawn } = {}) {
  const script = fileURLToPath(new URL(`./${stage}.js`, import.meta.url));
  if (signal?.aborted) return Promise.reject(stageFailure(stage, null, signal.reason));
  return new Promise((resolve, reject) => {
    const child = spawnImpl(process.execPath, [script, ...args], { stdio: "inherit", env });
    const onAbort = () => child.kill(signal.reason);
    signal?.addEventListener("abort", onAbort, { once: true });
    child.once("error", error => {
      signal?.removeEventListener("abort", onAbort);
      reject(error);
    });
    child.once("close", (code, childSignal) => {
      signal?.removeEventListener("abort", onAbort);
      if (code === 0 && !signal?.aborted) resolve();
      else reject(stageFailure(stage, code, signal?.aborted ? signal.reason : childSignal));
    });
  });
}

function stageFailure(stage, code, signal) {
  const exitCode = signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : code || 1;
  return Object.assign(new Error(`Build stage ${stage} failed (${signal ?? code ?? "unknown"})`), { exitCode, signal, stage });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBuildCli().catch(error => {
    console.error(error.message);
    process.exitCode = error.exitCode || 1;
  });
}
