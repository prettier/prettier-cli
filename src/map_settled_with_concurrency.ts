async function mapSettledWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(values.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (true) {
      const index = nextIndex++;
      if (index >= values.length) return;

      try {
        results[index] = {
          status: "fulfilled",
          value: await mapper(values[index], index),
        };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  const runnersCount = Math.min(values.length, Math.max(1, Math.floor(concurrency)));
  await Promise.all(Array.from({ length: runnersCount }, runNext));

  return results;
}

export { mapSettledWithConcurrency };
