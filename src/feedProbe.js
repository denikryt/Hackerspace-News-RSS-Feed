import { runWithNetworkRetry } from "./networkRetry.js";

export async function probeFeedUrl({
  sourceRow,
  fetchImpl = fetch,
  waitImpl,
  retryDelaysMs,
  logger,
}) {
  const candidateUrl = sourceRow.candidateFeedUrl;

  try {
    const response = await runWithNetworkRetry({
      run: () => fetchFeedWithTimeout({ candidateUrl, fetchImpl }),
      waitImpl,
      retryDelaysMs,
      onRetry: ({ attemptNumber, maxAttempts, delayMs, errorCode }) => {
        if (typeof logger === "function") {
          logger(
            `[refresh] retrying feed fetch: ${candidateUrl} after ${errorCode} (attempt ${attemptNumber}/${maxAttempts}, wait ${delayMs}ms)`,
          );
        }
      },
    });

    const body = await response.text();
    const contentType = response.headers.get("content-type") || "";
    const detectedFormat = detectFeedFormat(body, contentType);
    const isParsable = Boolean(detectedFormat);

    return {
      candidateUrl,
      finalUrl: response.url || candidateUrl,
      httpStatus: response.status,
      contentType,
      fetchOk: response.ok,
      isFeedLike: isParsable,
      isParsable,
      detectedFormat,
      errorCode: buildErrorCode({ responseOk: response.ok, contentType, isParsable }),
      errorMessage: response.ok
        ? undefined
        : `HTTP ${response.status}`,
      body,
    };
  } catch (error) {
    return {
      candidateUrl,
      finalUrl: candidateUrl,
      httpStatus: null,
      contentType: null,
      fetchOk: false,
      isFeedLike: false,
      isParsable: false,
      detectedFormat: null,
      errorCode: error?.name === "AbortError" ? "timeout" : "fetch_error",
      errorMessage: error instanceof Error ? error.message : String(error),
      body: null,
    };
  }
}

async function fetchFeedWithTimeout({ candidateUrl, fetchImpl }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  return fetchImpl(candidateUrl, {
    redirect: "follow",
    signal: controller.signal,
    headers: {
      "user-agent": "HackerspaceNewsFeed/0.1 (+local)",
      accept: "application/atom+xml, application/rss+xml, application/xml, text/xml, */*",
    },
  }).finally(() => clearTimeout(timeoutId));
}

function detectFeedFormat(body, contentType) {
  const text = String(body || "").trim().toLowerCase();
  const type = String(contentType || "").toLowerCase();

  if (!text) {
    return null;
  }

  if (type.includes("html") && !text.startsWith("<?xml")) {
    return null;
  }

  if (text.includes("<rss") || type.includes("rss")) {
    return "rss";
  }

  if (text.includes("<feed") || type.includes("atom")) {
    return "atom";
  }

  if (text.includes("<rdf:rdf")) {
    return "rdf";
  }

  return null;
}

function buildErrorCode({ responseOk, contentType, isParsable }) {
  if (!responseOk) {
    return "http_error";
  }
  if (isParsable) {
    return null;
  }
  if (String(contentType).includes("html")) {
    return "non_feed_html";
  }
  return "non_feed_content";
}
