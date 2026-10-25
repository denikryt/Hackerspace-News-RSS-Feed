import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, it } from "vitest";

// Builder snapshots must live in a named volume instead of a copied host tree.
it("keeps generated data out of the image and mounts persistent builder data", () => {
  const ignored = readFileSync(resolve(".dockerignore"), "utf8").split(/\r?\n/);
  const compose = readFileSync(resolve("docker-compose.yml"), "utf8");

  expect(ignored).toContain("data");
  expect(compose).toMatch(/site-builder:[\s\S]*?- site-data:\/app\/data/);
  expect(compose).toMatch(/volumes:[\s\S]*?site-data:/);
});
