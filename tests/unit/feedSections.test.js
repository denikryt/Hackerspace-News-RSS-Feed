import { describe, expect, it } from "vitest";

import feedSectionsConfig from "../../config/feed_sections.json" with { type: "json" };
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
    expect(PUBLIC_FEED_SECTION_IDS).toEqual(
      expect.arrayContaining(["community", "events", "news", "blogs", "projects", "hackerspaces", "workshops"]),
    );
  });

  it("builds hrefs and output paths directly from the feed section key", () => {
    expect(getFeedSectionHref("hackerspaces")).toBe("/hackerspaces/index.html");
    expect(getFeedSectionHref("events", 2)).toBe("/events/page/2/");
    expect(getFeedSectionOutputPath("hackerspaces")).toBe("hackerspaces/index.html");
    expect(getFeedSectionOutputPath("events", 2)).toBe("events/page/2/index.html");
  });

  it("fails explicitly for unknown feed sections", () => {
    expect(() => getFeedSectionDefinition("missing")).toThrow("Unknown feed section: missing");
  });
});
