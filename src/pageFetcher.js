export async function fetchPageHtml({ sourcePageUrl, fetchImpl = fetch }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);

  const response = await fetchImpl(sourcePageUrl, {
    redirect: "follow",
    signal: controller.signal,
    headers: {
      "user-agent": "HackerspaceNewsFeed/0.1 (+local)",
      accept: "text/html,application/xhtml+xml",
    },
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    throw new Error(`Failed to fetch source page: HTTP ${response.status}`);
  }

  return response.text();
}
