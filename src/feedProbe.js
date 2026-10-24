import { fetchBoundedText } from "./http/fetchBoundedText.js";
import { RESOURCE_LIMITS } from "./resourceLimits.js";
import { runWithNetworkRetry } from "./networkRetry.js";
import { getAttemptTimeoutMs } from "./networkAttemptTimeout.js";

export async function probeFeedUrl({
  sourceRow,
  fetchImpl = fetch,
  waitImpl,
  retryDelaysMs,
  attemptTimeoutsMs,
  logger,
}) {
  const candidateUrl = sourceRow.candidateFeedUrl;

  try {
    const response = await runWithNetworkRetry({
      run: ({ attemptNumber }) => fetchFeedWithTimeout({
        candidateUrl,
        fetchImpl,
        timeoutMs: getAttemptTimeoutMs({ attemptNumber, timeoutsMs: attemptTimeoutsMs }),
      }),
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

    const body = response.text;
    const contentType = response.contentType;
    const detectedFormat = detectFeedFormat(body, contentType);
    const isParsable = Boolean(detectedFormat);

    return {
      candidateUrl,
      finalUrl: response.finalUrl || candidateUrl,
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
      errorCode: error?.code || (error?.name === "AbortError" ? "timeout" : "fetch_error"),
      errorMessage: error instanceof Error ? error.message : String(error),
      body: null,
    };
  }
}

function fetchFeedWithTimeout({ candidateUrl, fetchImpl, timeoutMs }) {
  return fetchBoundedText({ url: candidateUrl, fetchImpl, timeoutMs, maxBodyBytes: RESOURCE_LIMITS.feedMaxBodyBytes,
    headers: {
      "user-agent": "HackerspaceNewsFeed/0.1 (+local)",
      accept: "application/atom+xml, application/rss+xml, application/xml, text/xml, */*",
    }
  });
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
  return "non_xml_response";
}
