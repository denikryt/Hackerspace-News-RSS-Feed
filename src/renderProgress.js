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
