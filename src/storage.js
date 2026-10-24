import { createMemoryDiagnostics } from "./memoryDiagnostics.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function writeJson(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  const memory = createMemoryDiagnostics();
  memory("json:before");
  const json = `${JSON.stringify(value, null, 2)}\n`;
  memory("json:serialized", { largestInputBytes: Buffer.byteLength(json) });
  await writeFile(filePath, json, "utf8");
  memory("json:written");
}

export async function readJson(filePath) {
  const json = await readFile(filePath, "utf8");
  return JSON.parse(json);
}

export async function writeText(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, value, "utf8");
}
