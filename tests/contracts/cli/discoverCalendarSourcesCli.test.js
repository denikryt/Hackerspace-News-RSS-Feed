import { describe, expect, it, vi } from "vitest";

import { runDiscoverCalendarSourcesCli } from "../../../src/cli/discoverCalendarSources.js";

describe("runDiscoverCalendarSourcesCli", () => {
  it("writes only new ICS sources discovered through the SpaceAPI table", async () => {
    const logger = vi.fn();
    const readJsonImpl = vi.fn().mockResolvedValue({
      items: [
        {
          url: "https://calendar.existing.example/public/basic.ics",
          country: "USA",
          hs_name: "Existing Space",
        },
      ],
    });
    const writeJsonImpl = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = vi.fn(async (url) => {
      if (url === "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds") {
        return response({
          url,
          body: `
            <h3><span id="Spaces_with_SpaceAPI">Spaces with SpaceAPI</span></h3>
            <table>
              <tr><th>Hackerspace</th><th>SpaceAPI</th><th>Country</th></tr>
              <tr data-row-number="1">
                <td><a href="/Existing_Space">Existing Space</a></td>
                <td><a href="https://status.existing.example/spaceapi.json">https://status.existing.example/spaceapi.json</a></td>
                <td>USA</td>
              </tr>
              <tr data-row-number="2">
                <td><a href="/New_Space">New Space</a></td>
                <td><a href="https://status.new.example/spaceapi.json">https://status.new.example/spaceapi.json</a></td>
                <td>Germany</td>
              </tr>
            </table>
          `,
          contentType: "text/html; charset=utf-8",
        });
      }

      if (url === "https://status.existing.example/spaceapi.json") {
        return response({
          url,
          body: JSON.stringify({
            feeds: {
              calendar: {
                url: "https://calendar.existing.example/public/basic.ics",
              },
            },
          }),
        });
      }

      if (url === "https://status.new.example/spaceapi.json") {
        return response({
          url,
          body: JSON.stringify({
            feeds: {
              calendar: {
                url: "https://calendar.new.example/public/basic.ics",
              },
            },
          }),
        });
      }

      throw new Error(`unexpected url ${url}`);
    });

    const paths = {
      calendarSources: "/tmp/content/ics_events.json",
    };

    const payload = await runDiscoverCalendarSourcesCli({
      fetchImpl,
      readJsonImpl,
      writeJsonImpl,
      logger,
      paths,
      sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
    });

    expect(readJsonImpl).toHaveBeenCalledWith(paths.calendarSources);
    expect(writeJsonImpl).toHaveBeenCalledWith(paths.calendarSources, {
      items: [
        {
          url: "https://calendar.existing.example/public/basic.ics",
          country: "USA",
          hs_name: "Existing Space",
        },
        {
          url: "https://calendar.new.example/public/basic.ics",
          country: "Germany",
          hs_name: "New Space",
        },
      ],
    });
    expect(payload.items).toHaveLength(2);
    expect(logger).toHaveBeenCalledWith("Calendar source discovery completed: added=1 total=2");
  });

  it("skips unreachable SpaceAPI endpoints instead of aborting the whole discovery run", async () => {
    const logger = vi.fn();
    const readJsonImpl = vi.fn().mockResolvedValue({ items: [] });
    const writeJsonImpl = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = vi.fn(async (url) => {
      if (url === "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds") {
        return response({
          url,
          body: `
            <h3><span id="Spaces_with_SpaceAPI">Spaces with SpaceAPI</span></h3>
            <table>
              <tr><th>Hackerspace</th><th>SpaceAPI</th><th>Country</th></tr>
              <tr data-row-number="1">
                <td><a href="/Broken_Space">Broken Space</a></td>
                <td><a href="https://status.broken.example/spaceapi.json">https://status.broken.example/spaceapi.json</a></td>
                <td>USA</td>
              </tr>
              <tr data-row-number="2">
                <td><a href="/Working_Space">Working Space</a></td>
                <td><a href="https://status.working.example/spaceapi.json">https://status.working.example/spaceapi.json</a></td>
                <td>Germany</td>
              </tr>
            </table>
          `,
          contentType: "text/html; charset=utf-8",
        });
      }

      if (url === "https://status.broken.example/spaceapi.json") {
        throw new Error("getaddrinfo ENOTFOUND status.broken.example");
      }

      if (url === "https://status.working.example/spaceapi.json") {
        return response({
          url,
          body: JSON.stringify({
            feeds: {
              calendar: {
                url: "https://calendar.working.example/public/basic.ics",
              },
            },
          }),
        });
      }

      throw new Error(`unexpected url ${url}`);
    });

    const payload = await runDiscoverCalendarSourcesCli({
      fetchImpl,
      readJsonImpl,
      writeJsonImpl,
      logger,
      paths: {
        calendarSources: "/tmp/content/ics_events.json",
      },
      sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
    });

    expect(payload).toEqual({
      items: [
        {
          url: "https://calendar.working.example/public/basic.ics",
          country: "Germany",
          hs_name: "Working Space",
        },
      ],
    });
    expect(logger).toHaveBeenCalledWith(
      "[calendar-discovery] skipped https://status.broken.example/spaceapi.json (getaddrinfo ENOTFOUND status.broken.example)",
    );
  });
});

function response({ url, body, contentType = "application/json; charset=utf-8", status = 200 }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: {
      get(name) {
        return name.toLowerCase() === "content-type" ? contentType : null;
      },
    },
    async text() {
      return body;
    },
  };
}
