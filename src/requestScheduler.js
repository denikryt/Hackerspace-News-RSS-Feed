export function createRequestScheduler({
  concurrency = 6,
  minDelayMs = 250,
  waitImpl = wait,
} = {}) {
  const queue = [];
  let activeCount = 0;
  let startChain = Promise.resolve();
  let hasStartedTask = false;

  function schedule(run) {
    return new Promise((resolve, reject) => {
      queue.push({ run, resolve, reject });
      pump();
    });
  }

  function pump() {
    while (activeCount < concurrency && queue.length > 0) {
      const entry = queue.shift();
      activeCount += 1;
      void runEntry(entry);
    }
  }

  async function runEntry(entry) {
    try {
      await waitForStartTurn();
      const result = await entry.run();
      entry.resolve(result);
    } catch (error) {
      entry.reject(error);
    } finally {
      activeCount -= 1;
      pump();
    }
  }

  function waitForStartTurn() {
    const currentTurn = startChain.then(async () => {
      if (hasStartedTask && minDelayMs > 0) {
        await waitImpl(minDelayMs);
      }
      hasStartedTask = true;
    });
    startChain = currentTurn.catch(() => {});
    return currentTurn;
  }

  return { schedule };
}

function wait(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
