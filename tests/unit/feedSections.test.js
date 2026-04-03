import { describe, expect, it } from "vitest";

import feedSectionsConfig from "../../config/feed_sections.json" with { type: "json" };
import {
  assertFeedSectionCategoryContract,
} from "../../src/feedSectionCategoryContract.js";
import {
  FALLBACK_CONTENT_STREAM_ID,
  FEED_CONTENT_STREAM_ID,
  PUBLIC_FEED_SECTION_IDS,
  getFeedSectionDefinition,
  getFeedSectionHref,
  getFeedSectionOutputPath,
} from "../../src/feedSections.js";

describe("feedSections", () => {
  it("loads feed section metadata from config without locking exact manual entries", () => {
    expect(feedSectionsConfig).toEqual(expect.any(Object));
    expect(Object.keys(feedSectionsConfig)).toEqual(
      expect.arrayContaining([FEED_CONTENT_STREAM_ID, FALLBACK_CONTENT_STREAM_ID]),
    );
  });

  it("derives the full feed section definition from the config key plus label and intro", () => {
    expect(getFeedSectionDefinition("events")).toEqual({
      id: "events",
      segment: "events",
      label: "Events",
      pageTitle: "Events",
      pageIntro: "Items tagged as events.",
    });
  });

  it("keeps feed and fallback as explicit special sections while deriving public category sections from config keys", () => {
    expect(getFeedSectionDefinition(FEED_CONTENT_STREAM_ID)).toEqual(
      expect.objectContaining({
        id: FEED_CONTENT_STREAM_ID,
        segment: FEED_CONTENT_STREAM_ID,
      }),
    );
    expect(getFeedSectionDefinition(FALLBACK_CONTENT_STREAM_ID)).toEqual(
      expect.objectContaining({
        id: FALLBACK_CONTENT_STREAM_ID,
        segment: FALLBACK_CONTENT_STREAM_ID,
      }),
    );
    expect(PUBLIC_FEED_SECTION_IDS).not.toContain(FEED_CONTENT_STREAM_ID);
    expect(PUBLIC_FEED_SECTION_IDS).not.toContain(FALLBACK_CONTENT_STREAM_ID);
    expect(PUBLIC_FEED_SECTION_IDS.length).toBeGreaterThan(0);
  });

  it("builds hrefs and output paths directly from the feed section key", () => {
    expect(getFeedSectionHref("hackerspace")).toBe("/hackerspace/index.html");
    expect(getFeedSectionHref("events", 2)).toBe("/events/page/2/");
    expect(getFeedSectionOutputPath("hackerspace")).toBe("hackerspace/index.html");
    expect(getFeedSectionOutputPath("events", 2)).toBe("events/page/2/index.html");
  });

  it("fails explicitly for unknown feed sections", () => {
    expect(() => getFeedSectionDefinition("missing")).toThrow("Unknown feed section: missing");
  });

  it("fails explicitly when dictionary categories and feed-section keys drift apart", () => {
    expect(() =>
      assertFeedSectionCategoryContract({
        feedSectionsConfig: {
          feed: { label: "Feed", intro: "All publications sorted from new to old." },
          news: { label: "News", intro: "Items tagged as news." },
          extra: { label: "Extra", intro: "Unexpected section." },
          other: { label: "Other", intro: "Items outside the public category streams." },
        },
        categoryDictionary: {
          alpha: "news",
          beta: "events",
        },
        specialSectionIds: [FEED_CONTENT_STREAM_ID, FALLBACK_CONTENT_STREAM_ID],
      })
    ).toThrow(
      "Feed section/category contract mismatch.",
    );
  });
});
