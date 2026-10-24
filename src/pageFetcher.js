import { fetchBoundedText } from "./http/fetchBoundedText.js";
import { RESOURCE_LIMITS } from "./resourceLimits.js";
import { runWithNetworkRetry } from "./networkRetry.js";
import { getAttemptTimeoutMs } from "./networkAttemptTimeout.js";

export async function fetchPageHtml({
  sourcePageUrl,
  fetchImpl = fetch,
  waitImpl,
  retryDelaysMs,
  logger,
}) {
  const response = await runWithNetworkRetry({
    run: ({ attemptNumber }) => fetchWithTimeout({
      sourcePageUrl,
      fetchImpl,
      timeoutMs: getAttemptTimeoutMs({ attemptNumber }),
    }),
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

  return response.text;
}

function fetchWithTimeout({ sourcePageUrl, fetchImpl, timeoutMs }) {
  return fetchBoundedText({ url: sourcePageUrl, fetchImpl, timeoutMs, maxBodyBytes: RESOURCE_LIMITS.htmlMaxBodyBytes,
    headers: {
      "user-agent": "HackerspaceNewsFeed/0.1 (+local)",
      accept: "text/html,application/xhtml+xml",
    }
  });
}
