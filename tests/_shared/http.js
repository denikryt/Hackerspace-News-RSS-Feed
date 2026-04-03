// Build fetch-like text responses for integration tests that stub network IO.
export function createTextResponse({ url, contentType, body, status = 200 }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: new Headers({ "content-type": contentType }),
    text: () => Promise.resolve(body),
  };
}

// Return an HTML response stub with the default content type used in fixtures.
export function createHtmlResponse(url, body, status = 200) {
  return createTextResponse({
    url,
    contentType: "text/html; charset=utf-8",
    body,
    status,
  });
}

// Return an XML feed response stub for feed-probing and refresh/render integration tests.
export function createFeedResponse(url, body, { contentType = "application/rss+xml", status = 200 } = {}) {
  return createTextResponse({
    url,
    contentType,
    body,
    status,
  });
}
