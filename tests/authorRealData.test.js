import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { buildGlobalFeedModel } from "../src/viewModels/globalFeed.js";
import { buildSpaceDetailModel } from "../src/viewModels/spaceDetail.js";

describe("author links on real data", () => {
  it("builds author links from the real normalized snapshot without full-site rendering", async () => {
    const normalizedPayload = JSON.parse(
      await readFile(new URL("../data/feeds_normalized.json", import.meta.url), "utf8"),
    );

    const globalFeed = buildGlobalFeedModel(normalizedPayload, { pageSize: 5000 });
    const betaMachineDetail = buildSpaceDetailModel(normalizedPayload, "betamachine", {
      pageSize: 5000,
    });
    const baselDetail = buildSpaceDetailModel(normalizedPayload, "chaos-computer-club-basel", {
      pageSize: 5000,
    });
    const betaMachineExcludedDetail = buildSpaceDetailModel(normalizedPayload, "betamachine", {
      pageSize: 5000,
    });

    const lucilleItem = betaMachineDetail.items.find(
      (item) => item.resolvedAuthor === "Lucille DEWITTE",
    );
    const baselItem = baselDetail.items.find(
      (item) => item.resolvedAuthor === "kuchenblechmafia, s3lph",
    );
    const excludedItem = betaMachineExcludedDetail.items.find((item) => item.resolvedAuthor === "adminbeta");

    expect(lucilleItem?.authorLinks).toEqual([
      { label: "Lucille DEWITTE", href: "/authors/lucille-dewitte.html" },
    ]);

    expect(baselItem?.authorLinks).toEqual([
      { label: "kuchenblechmafia", href: "/authors/kuchenblechmafia.html" },
      { label: "s3lph", href: "/authors/s3lph.html" },
    ]);

    expect(excludedItem?.authorLinks).toEqual([]);

    const globalLucille = globalFeed.items.find((item) => item.resolvedAuthor === "Lucille DEWITTE");
    expect(globalLucille?.authorLinks).toEqual([
      { label: "Lucille DEWITTE", href: "/authors/lucille-dewitte.html" },
    ]);
  });
});
