import { describe, expect, it } from "vitest";

import {
  filterNormalizedPayloadForDisplay,
  getEffectiveItemDate,
  isFutureDatedItem,
} from "../src/visibleData.js";

describe("visible data filtering", () => {
  it("uses publishedAt first and falls back to updatedAt", () => {
    expect(
      getEffectiveItemDate({
        publishedAt: "2025-01-01T10:00:00.000Z",
        updatedAt: "2025-01-02T10:00:00.000Z",
      }),
    ).toBe("2025-01-01T10:00:00.000Z");

    expect(
      getEffectiveItemDate({
        updatedAt: "2025-01-02T10:00:00.000Z",
      }),
    ).toBe("2025-01-02T10:00:00.000Z");
  });

  it("detects future-dated items using injected now", () => {
    const now = Date.parse("2026-03-19T12:00:00.000Z");

    expect(
      isFutureDatedItem(
        { publishedAt: "2034-07-28T18:00:00.000Z" },
        { now },
      ),
    ).toBe(true);

    expect(
      isFutureDatedItem(
        { publishedAt: "2026-03-19T11:59:59.000Z" },
        { now },
      ),
    ).toBe(false);
  });

  it("filters future-dated items out before view models are built", () => {
    const payload = {
      feeds: [
        {
          spaceName: "Example",
          items: [
            { title: "Future", publishedAt: "2034-07-28T18:00:00.000Z" },
            { title: "Visible", publishedAt: "2025-01-02T10:00:00.000Z" },
            { title: "Fallback updated", updatedAt: "2025-01-01T10:00:00.000Z" },
          ],
        },
      ],
      failures: [],
      summary: {},
    };

    const filtered = filterNormalizedPayloadForDisplay(payload, {
      now: Date.parse("2026-03-19T12:00:00.000Z"),
    });

    expect(filtered.feeds[0].items.map((item) => item.title)).toEqual([
      "Visible",
      "Fallback updated",
    ]);
  });
});
