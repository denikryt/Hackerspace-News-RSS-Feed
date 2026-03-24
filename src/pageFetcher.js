const RETRY_DELAYS_MS = [1000, 2000, 3000];

export async function fetchPageHtml({
  sourcePageUrl,
  fetchImpl = fetch,
  waitImpl = wait,
  retryDelaysMs = RETRY_DELAYS_MS,
}) {
  for (let attemptIndex = 0; attemptIndex <= retryDelaysMs.length; attemptIndex += 1) {
    try {
      const response = await fetchWithTimeout({ sourcePageUrl, fetchImpl });

      if (!response.ok) {
        throw new Error(`Failed to fetch source page: HTTP ${response.status}`);
      }

      return response.text();
    } catch (error) {
      if (!isRetryableNetworkError(error) || attemptIndex === retryDelaysMs.length) {
        throw error;
      }

      await waitImpl(retryDelaysMs[attemptIndex]);
    }
  }

  throw new Error("Unreachable retry state");
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

function isRetryableNetworkError(error) {
  if (error?.name === "AbortError") {
    return true;
  }

  const retryableCodes = new Set(["AbortError", "EAI_AGAIN", "ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT"]);
  const codes = collectErrorCodes(error);

  return codes.some((code) => retryableCodes.has(code));
}

function collectErrorCodes(error) {
  const codes = [];

  if (!error || typeof error !== "object") {
    return codes;
  }

  if ("code" in error && typeof error.code === "string") {
    codes.push(error.code);
  }

  if ("cause" in error) {
    codes.push(...collectErrorCodes(error.cause));
  }

  if (error instanceof AggregateError) {
    for (const nestedError of error.errors) {
      codes.push(...collectErrorCodes(nestedError));
    }
  }

  return codes;
}

function wait(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
