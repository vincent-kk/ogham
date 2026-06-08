export interface Throttle {
  acquire(): Promise<void>;
}

const sleepPromise = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Min-interval gate that paces bursts. `nextAllowed` is reserved
 * synchronously before awaiting, so N concurrent callers space their
 * dispatch at `t, t+I, t+2I…`. `minIntervalMs <= 0` returns instantly.
 * `now`/`sleep` are injectable for deterministic tests.
 */
export function createThrottle(
  minIntervalMs: number,
  now: () => number = Date.now,
  sleep: (ms: number) => Promise<void> = sleepPromise,
): Throttle {
  let nextAllowed = 0;
  return {
    async acquire(): Promise<void> {
      if (minIntervalMs <= 0) return;
      const t = now();
      const at = Math.max(t, nextAllowed);
      nextAllowed = at + minIntervalMs;
      const wait = at - t;
      if (wait > 0) await sleep(wait);
    },
  };
}
