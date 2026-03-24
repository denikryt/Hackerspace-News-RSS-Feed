const DEFAULT_RETRY_DELAYS_MS = [1000, 2000, 3000];

export async function runWithNetworkRetry({
  run,
  waitImpl = wait,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
  onRetry,
}) {
  for (let attemptIndex = 0; attemptIndex <= retryDelaysMs.length; attemptIndex += 1) {
    try {
      return await run();
    } catch (error) {
      if (!isRetryableNetworkError(error) || attemptIndex === retryDelaysMs.length) {
        throw error;
      }

      const delayMs = retryDelaysMs[attemptIndex];
      if (typeof onRetry === "function") {
        onRetry({
          attemptNumber: attemptIndex + 2,
          maxAttempts: retryDelaysMs.length + 1,
          delayMs,
          errorCode: getPrimaryErrorCode(error),
          error,
        });
      }

      await waitImpl(delayMs);
    }
  }

  throw new Error("Unreachable retry state");
}

function isRetryableNetworkError(error) {
  if (error?.name === "AbortError") {
    return true;
  }

  const retryableCodes = new Set([
    "AbortError",
    "EAI_AGAIN",
    "ECONNRESET",
    "ETIMEDOUT",
    "UND_ERR_CONNECT_TIMEOUT",
  ]);

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

function getPrimaryErrorCode(error) {
  if (error?.name === "AbortError") {
    return "AbortError";
  }

  return collectErrorCodes(error)[0] || "unknown_error";
}

function wait(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
