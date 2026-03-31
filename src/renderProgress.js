/**
 * Format sparse progress logs for long-running primary-stream rendering.
 * The first page is logged without timing, later checkpoints show elapsed
 * time since the previous checkpoint so large runs can be diagnosed quickly.
 */
export function formatPrimaryStreamProgressLog({
  currentPage,
  totalPages,
  lastCheckpointAt,
  checkpointAt,
}) {
  if (currentPage === 1) {
    return {
      message: `[render] primary stream progress: page ${currentPage}/${totalPages}`,
      checkpointAt: lastCheckpointAt,
    };
  }

  const elapsedMs = checkpointAt - lastCheckpointAt;
  return {
    message: `[render] primary stream progress: page ${currentPage}/${totalPages} (+${elapsedMs}ms)`,
      checkpointAt,
    };
}

/**
 * Shared sparse-progress formatter for long render loops. Logs the first item
 * without timing and later checkpoints with elapsed time since the previous
 * checkpoint so large loops stay observable without spamming every iteration.
 */
export function formatLoopProgressLog({
  label,
  currentIndex,
  totalItems,
  lastCheckpointAt,
  checkpointAt,
}) {
  if (currentIndex === 1) {
    return {
      message: `[render] ${label} progress: item ${currentIndex}/${totalItems}`,
      checkpointAt: lastCheckpointAt,
    };
  }

  const elapsedMs = checkpointAt - lastCheckpointAt;
  return {
    message: `[render] ${label} progress: item ${currentIndex}/${totalItems} (+${elapsedMs}ms)`,
    checkpointAt,
  };
}
