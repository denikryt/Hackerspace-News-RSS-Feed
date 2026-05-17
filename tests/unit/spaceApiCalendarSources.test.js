import { describe, expect, it } from "vitest";

import {
  extractCalendarFeedUrlFromSpaceApi,
  extractSpaceApiSourceRows,
} from "../../src/spaceApiCalendarSources.js";

const sourcePageUrl = "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds";

describe("spaceApiCalendarSources", () => {
  it("extracts rows only from the Spaces_with_SpaceAPI table", () => {
    const rows = extractSpaceApiSourceRows({
      html: `
        <h3><span id="Spaces_with_RSS_feeds">Spaces with RSS feeds</span></h3>
        <table>
          <tr><th>Hackerspace</th><th>Newsfeed</th><th>Country</th></tr>
          <tr data-row-number="1">
            <td><a href="/Ignored">Ignored</a></td>
            <td><a href="https://ignored.example/feed.xml">https://ignored.example/feed.xml</a></td>
            <td>Nowhere</td>
          </tr>
        </table>
        <h3><span id="Spaces_with_SpaceAPI">Spaces with SpaceAPI</span></h3>
        <table>
          <tr><th>Hackerspace</th><th>SpaceAPI</th><th>Country</th></tr>
          <tr data-row-number="7">
            <td><a href="/Noisebridge">Noisebridge</a></td>
            <td><a href="https://spaceapi.noisebridge.example/status.json">https://spaceapi.noisebridge.example/status.json</a></td>
            <td>USA</td>
          </tr>
        </table>
      `,
      sourcePageUrl,
    });

    expect(rows).toEqual([
      {
        rowNumber: 7,
        hackerspaceName: "Noisebridge",
        hackerspaceWikiPath: "/Noisebridge",
        hackerspaceWikiUrl: "https://wiki.hackerspaces.org/Noisebridge",
        country: "USA",
        spaceApiUrl: "https://spaceapi.noisebridge.example/status.json",
        dedupeKey: "https://spaceapi.noisebridge.example/status.json",
      },
    ]);
  });

  it("extracts only the observed feeds.calendar.url field from SpaceAPI payloads", () => {
    expect(extractCalendarFeedUrlFromSpaceApi({
      feeds: {
        calendar: {
          url: "https://events.example/calendar.ics",
        },
      },
    })).toBe("https://events.example/calendar.ics");

    expect(extractCalendarFeedUrlFromSpaceApi({
      feeds: {
        calendar: {
          title: "calendar",
        },
      },
    })).toBeNull();

    expect(extractCalendarFeedUrlFromSpaceApi({
      feeds: {
        calendar: {
          url: "mailto:test@example.com",
        },
      },
    })).toBeNull();
  });
});
