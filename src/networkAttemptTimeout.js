export const DEFAULT_ATTEMPT_TIMEOUTS_MS = [1000, 2000, 3000];

export function getAttemptTimeoutMs({
  attemptNumber,
  timeoutsMs = DEFAULT_ATTEMPT_TIMEOUTS_MS,
}) {
  const normalizedAttemptNumber = Number.isFinite(attemptNumber) && attemptNumber > 0
    ? Math.floor(attemptNumber)
    : 1;
  const timeoutIndex = Math.min(normalizedAttemptNumber - 1, timeoutsMs.length - 1);
  return timeoutsMs[timeoutIndex];
}
