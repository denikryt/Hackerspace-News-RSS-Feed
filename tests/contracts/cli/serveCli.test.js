import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { cleanupTrackedTempDirs, createTempDirTracker, createTrackedTempDir } from "../../_shared/tempDirs.js";

import { createPreviewServer } from "../../../src/cli/serve.js";

const tempDirs = createTempDirTracker();

afterEach(async () => {
  await cleanupTrackedTempDirs(tempDirs);
});

describe("createPreviewServer", () => {
  it("serves root, extensionless routes, explicit file routes, nested directory routes, and static assets", async () => {
    const distDir = await createDistFixture();
    const { baseUrl, close } = await startServer({ distDir });

    try {
      const [rootResponse, feedResponse, fileRouteResponse, pagedRouteResponse, faviconResponse] =
        await Promise.all([
          fetch(`${baseUrl}/`),
          fetch(`${baseUrl}/feed`),
          fetch(`${baseUrl}/spaces/example.html`),
          fetch(`${baseUrl}/spaces/example/page/2/`),
          fetch(`${baseUrl}/favicon.png`),
        ]);

      expect(rootResponse.status).toBe(200);
      expect(await rootResponse.text()).toContain("Home");

      expect(feedResponse.status).toBe(200);
      expect(feedResponse.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(await feedResponse.text()).toContain("Feed");

      expect(fileRouteResponse.status).toBe(200);
      expect(await fileRouteResponse.text()).toContain("Space detail");

      expect(pagedRouteResponse.status).toBe(200);
      expect(await pagedRouteResponse.text()).toContain("Page 2");

      expect(faviconResponse.status).toBe(200);
      expect(faviconResponse.headers.get("content-type")).toBe("image/png");
      expect(new Uint8Array(await faviconResponse.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]));
    } finally {
      await close();
    }
  });

  it("returns 404 for missing files and path traversal attempts", async () => {
    const distDir = await createDistFixture();
    const { baseUrl, close } = await startServer({ distDir });

    try {
      const [missingResponse, traversalResponse] = await Promise.all([
        fetch(`${baseUrl}/missing-page`),
        fetch(`${baseUrl}/%2e%2e/package.json`),
      ]);

      expect(missingResponse.status).toBe(404);
      expect(await missingResponse.text()).toContain("Build output not found");

      expect(traversalResponse.status).toBe(404);
      expect(await traversalResponse.text()).toContain("Build output not found");
    } finally {
      await close();
    }
  });

  it("returns 500 for unexpected read failures", async () => {
    const distDir = await createDistFixture();
    const { baseUrl, close } = await startServer({
      distDir,
      readFileImpl: async (filePath) => {
        if (String(filePath).endsWith("favicon.png")) {
          throw Object.assign(new Error("disk error"), { code: "EIO" });
        }

        return new TextEncoder().encode("<html><body>ok</body></html>");
      },
    });

    try {
      const response = await fetch(`${baseUrl}/favicon.png`);

      expect(response.status).toBe(500);
      expect(await response.text()).toContain("Internal server error");
    } finally {
      await close();
    }
  });
});

async function createDistFixture() {
  const distDir = await createTrackedTempDir("hnf-serve-", tempDirs);

  await Promise.all([
    writeText(resolve(distDir, "index.html"), "<html><body>Home</body></html>"),
    writeText(resolve(distDir, "feed/index.html"), "<html><body>Feed</body></html>"),
    writeText(resolve(distDir, "spaces/example.html"), "<html><body>Space detail</body></html>"),
    writeText(resolve(distDir, "spaces/example/page/2/index.html"), "<html><body>Page 2</body></html>"),
    writeBinary(resolve(distDir, "favicon.png"), new Uint8Array([137, 80, 78, 71])),
  ]);

  return distDir;
}

async function startServer(options) {
  const server = createPreviewServer(options);
  await new Promise((resolveListen) => {
    server.listen(0, "127.0.0.1", resolveListen);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected an address object for preview server");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error) {
            rejectClose(error);
            return;
          }

          resolveClose();
        });
      }),
  };
}

async function writeText(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, value, "utf8");
}

async function writeBinary(filePath, bytes) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
}
