const WAIT_CELL = new Int32Array(new SharedArrayBuffer(4));

export function waitForLock(durationMs: number): void {
  if (durationMs > 0) Atomics.wait(WAIT_CELL, 0, 0, durationMs);
}
