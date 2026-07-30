import { describe, expect, it } from 'vitest';

import { runLedger } from '../runLedger.js';
import { stopRuns } from '../stopRuns.js';
import { withActiveRun } from '../withActiveRun.js';

/** Resolves once the macrotask queue has drained, letting an abort propagate. */
function tick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('withActiveRun', () => {
  it('holds the run in the ledger while the body runs and clears it after', async () => {
    let seenDuringBody = 0;
    await withActiveRun({ sessionId: 's1', provider: 'codex' }, async () => {
      seenDuringBody = runLedger.size;
    });
    expect(seenDuringBody).toBe(1);
    expect(runLedger.size).toBe(0);
  });

  it('clears the ledger when the body throws', async () => {
    await expect(
      withActiveRun({ sessionId: 's2', provider: 'claude' }, () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(runLedger.size).toBe(0);
  });

  it('aborts the body signal when the caller signal aborts', async () => {
    const caller = new AbortController();
    const run = withActiveRun(
      { sessionId: 's3', provider: 'codex', callerSignal: caller.signal },
      (signal) =>
        new Promise<boolean>((resolve) => {
          signal.addEventListener('abort', () => resolve(true), { once: true });
        }),
    );
    await tick();
    caller.abort();
    expect(await run).toBe(true);
  });

  it('starts already aborted when the caller signal arrived aborted', async () => {
    const caller = new AbortController();
    caller.abort();
    const aborted = await withActiveRun(
      { sessionId: 's4', provider: 'antigravity', callerSignal: caller.signal },
      (signal) => Promise.resolve(signal.aborted),
    );
    expect(aborted).toBe(true);
  });

  it('aborts the body signal when stopRuns targets the run', async () => {
    const run = withActiveRun(
      { sessionId: 's5', provider: 'antigravity' },
      (signal) =>
        new Promise<boolean>((resolve) => {
          signal.addEventListener('abort', () => resolve(true), { once: true });
        }),
    );
    await tick();
    expect(stopRuns({ sessionId: 's5' })).toHaveLength(1);
    expect(await run).toBe(true);
  });

  it('removes the caller listener so a late abort cannot reach a finished run', async () => {
    const caller = new AbortController();
    await withActiveRun(
      { sessionId: 's6', provider: 'codex', callerSignal: caller.signal },
      () => Promise.resolve('done'),
    );
    expect(() => caller.abort()).not.toThrow();
    expect(runLedger.size).toBe(0);
  });
});
