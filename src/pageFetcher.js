import { runWithNetworkRetry } from "./networkRetry.js";

export async function fetchPageHtml({
  sourcePageUrl,
  fetchImpl = fetch,
  waitImpl,
  retryDelaysMs,
  logger,
}) {
  const response = await runWithNetworkRetry({
    run: () => fetchWithTimeout({ sourcePageUrl, fetchImpl }),
    waitImpl,
    retryDelaysMs,
    onRetry: ({ attemptNumber, maxAttempts, delayMs, errorCode }) => {
      if (typeof logger === "function") {
        logger(
          `[refresh] retrying source page fetch: ${sourcePageUrl} after ${errorCode} (attempt ${attemptNumber}/${maxAttempts}, wait ${delayMs}ms)`,
        );
      }
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch source page: HTTP ${response.status}`);
  }

  return response.text();
}

async function fetchWithTimeout({ sourcePageUrl, fetchImpl }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  return fetchImpl(sourcePageUrl, {
    redirect: "follow",
    signal: controller.signal,
    headers: {
      "user-agent": "HackerspaceNewsFeed/0.1 (+local)",
      accept: "text/html,application/xhtml+xml",
    },
  }).finally(() => clearTimeout(timeoutId));
}
