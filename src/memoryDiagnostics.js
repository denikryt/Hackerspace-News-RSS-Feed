// Sparse opt-in checkpoints never include input content. Restricted hosts may
// hide RSS; report that as unavailable rather than claiming a measurement.
export function createMemoryDiagnostics({ enabled = process.env.BUILD_MEMORY_DIAGNOSTICS === '1', logger = console.log, memoryUsage = () => process.memoryUsage() } = {}) {
 return (stage, counters = {}) => {
  if (!enabled) return;
  const record = { stage };
  try {
   const memory = memoryUsage();
   for (const key of ['rss','heapUsed','external','arrayBuffers']) record[`${key}MiB`] = Number.isFinite(memory[key]) ? memory[key] / 1024 ** 2 : null;
  } catch (error) { record.rssMiB = null; record.memoryError = error.code || 'unavailable'; }
  for (const key of ['pagesWritten','failures','largestInputBytes']) if (Number.isFinite(counters[key])) record[key] = counters[key];
  logger(JSON.stringify(record));
 };
}
