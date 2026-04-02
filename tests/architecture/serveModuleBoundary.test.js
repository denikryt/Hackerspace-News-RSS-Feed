import { describe, expect, it, vi } from "vitest";

describe("serve module boundary", () => {
  it("does not create or start a server on module import", async () => {
    vi.resetModules();

    const createServer = vi.fn();
    vi.doMock("node:http", () => ({
      createServer,
    }));

    try {
      await import("../../src/cli/serve.js");

      expect(createServer).not.toHaveBeenCalled();
    } finally {
      vi.doUnmock("node:http");
      vi.resetModules();
    }
  });
});
