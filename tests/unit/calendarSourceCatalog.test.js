import { describe, expect, it, vi } from "vitest";

import { refreshCalendarSourcesCatalog } from "../../src/calendarSourceCatalog.js";

describe("calendarSourceCatalog", () => {
  it("probes SpaceAPI endpoints with concurrency capped at 4", async () => {
    let activeRequests = 0;
    let maxActiveRequests = 0;
    let startedRequests = 0;
    let releaseRequests;
    const releaseAllRequests = new Promise((resolve) => {
      releaseRequests = resolve;
    });

    const fetchImpl = vi.fn(async (url) => {
      startedRequests += 1;
      activeRequests += 1;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);

      await releaseAllRequests;
      activeRequests -= 1;

      return response({
        url,
        contentType: "application/json",
        body: JSON.stringify({
          feeds: {
            calendar: {
              url: `${url}/calendar.ics`,
            },
          },
        }),
      });
    });

    const refreshPromise = refreshCalendarSourcesCatalog({
      sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
      sourcePageHtml: `
        <h3><span id="Spaces_with_SpaceAPI">Spaces with SpaceAPI</span></h3>
        <table>
          <tr><th>Hackerspace</th><th>SpaceAPI</th><th>Country</th></tr>
          ${Array.from({ length: 6 }, (_, index) => `
            <tr data-row-number="${index + 1}">
              <td><a href="/Space_${index + 1}">Space ${index + 1}</a></td>
              <td><a href="https://status.space-${index + 1}.example/api/space">${`https://status.space-${index + 1}.example/api/space`}</a></td>
              <td>Germany</td>
            </tr>
          `).join("")}
        </table>
      `,
      calendarSourcesPath: "/tmp/content/ics_events.json",
      fetchImpl,
      readJsonImpl: vi.fn().mockResolvedValue({ items: [] }),
      writeSnapshots: false,
      logger: vi.fn(),
    });

    await waitFor(() => startedRequests === 4);

    expect(maxActiveRequests).toBe(4);

    releaseRequests();

    await expect(refreshPromise).resolves.toMatchObject({
      payload: {
        items: expect.arrayContaining([
          expect.objectContaining({
            hs_name: "Space 1",
            country: "Germany",
          }),
        ]),
      },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(6);
  });

  it("retries transient SpaceAPI fetch failures and eventually discovers the calendar url", async () => {
    const fetchImpl = vi.fn();
    fetchImpl
      .mockRejectedValueOnce(Object.assign(new Error("temporary dns failure"), { code: "EAI_AGAIN" }))
      .mockResolvedValueOnce(response({
        url: "https://status.nerdberg.example/api/space/",
        contentType: "application/json",
        body: JSON.stringify({
          feeds: {
            calendar: {
              url: "https://calendar.nerdberg.example/events.ics",
            },
          },
        }),
      }));

    const logger = vi.fn();
    const result = await refreshCalendarSourcesCatalog({
      sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
      sourcePageHtml: `
        <h3><span id="Spaces_with_SpaceAPI">Spaces with SpaceAPI</span></h3>
        <table>
          <tr><th>Hackerspace</th><th>SpaceAPI</th><th>Country</th></tr>
          <tr data-row-number="1">
            <td><a href="/Nerdberg">Nerdberg</a></td>
            <td><a href="https://status.nerdberg.example/api/space">https://status.nerdberg.example/api/space</a></td>
            <td>Germany</td>
          </tr>
        </table>
      `,
      calendarSourcesPath: "/tmp/content/ics_events.json",
      fetchImpl,
      readJsonImpl: vi.fn().mockResolvedValue({ items: [] }),
      writeSnapshots: false,
      logger,
      waitImpl: vi.fn().mockResolvedValue(undefined),
      retryDelaysMs: [1],
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.payload).toEqual({
      items: [
        {
          url: "https://calendar.nerdberg.example/events.ics",
          country: "Germany",
          hs_name: "Nerdberg",
        },
      ],
    });
    expect(logger).toHaveBeenCalledWith(
      "[calendar-discovery] retrying https://status.nerdberg.example/api/space after EAI_AGAIN (attempt 2/2, wait 1ms)",
    );
  });

  it("dedupes repeated SpaceAPI urls before fetch", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      url: "https://status.duplicate.example/spaceapi.json",
      contentType: "application/json",
      body: JSON.stringify({
        feeds: {
          calendar: {
            url: "https://calendar.duplicate.example/events.ics",
          },
        },
      }),
    }));

    const result = await refreshCalendarSourcesCatalog({
      sourcePageUrl: "https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds",
      sourcePageHtml: `
        <h3><span id="Spaces_with_SpaceAPI">Spaces with SpaceAPI</span></h3>
        <table>
          <tr><th>Hackerspace</th><th>SpaceAPI</th><th>Country</th></tr>
          <tr data-row-number="1">
            <td><a href="/Alpha">Alpha</a></td>
            <td><a href="https://status.duplicate.example/spaceapi.json">https://status.duplicate.example/spaceapi.json</a></td>
            <td>Germany</td>
          </tr>
          <tr data-row-number="2">
            <td><a href="/Alpha_Copy">Alpha Copy</a></td>
            <td><a href="https://status.duplicate.example/spaceapi.json">https://status.duplicate.example/spaceapi.json</a></td>
            <td>Germany</td>
          </tr>
        </table>
      `,
      calendarSourcesPath: "/tmp/content/ics_events.json",
      fetchImpl,
      readJsonImpl: vi.fn().mockResolvedValue({ items: [] }),
      writeSnapshots: false,
      logger: vi.fn(),
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.payload.items).toEqual([
      {
        url: "https://calendar.duplicate.example/events.ics",
        country: "Germany",
        hs_name: "Alpha",
      },
    ]);
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

async function waitFor(predicate, { attempts = 20 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) {
      return;
    }
    await Promise.resolve();
  }

  throw new Error("Timed out waiting for predicate");
}
