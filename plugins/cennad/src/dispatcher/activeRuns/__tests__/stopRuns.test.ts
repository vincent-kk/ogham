import { afterEach, describe, expect, it, vi } from 'vitest';

import { runLedger } from '../runLedger.js';
import { stopRuns } from '../stopRuns.js';
import type { ActiveRun } from '../types.js';

function seed(sessionId: string, provider: ActiveRun['provider']): () => void {
  const abort = vi.fn();
  runLedger.add({
    sessionId,
    provider,
    startedAt: performance.now(),
    abort,
  });
  return abort;
}

afterEach(() => {
  runLedger.clear();
});

describe('stopRuns', () => {
  it('stops every run when no filter is given', () => {
    const codex = seed('a', 'codex');
    const claude = seed('b', 'claude');

    const stopped = stopRuns();

    expect(stopped.map((run) => run.session_id).sort()).toEqual(['a', 'b']);
    expect(codex).toHaveBeenCalledOnce();
    expect(claude).toHaveBeenCalledOnce();
  });

  it('stops only the named session', () => {
    const wanted = seed('a', 'codex');
    const other = seed('b', 'codex');

    const stopped = stopRuns({ sessionId: 'a' });

    expect(stopped).toHaveLength(1);
    expect(stopped[0]?.session_id).toBe('a');
    expect(wanted).toHaveBeenCalledOnce();
    expect(other).not.toHaveBeenCalled();
  });

  it('stops only the named provider', () => {
    const codex = seed('a', 'codex');
    const antigravity = seed('b', 'antigravity');

    const stopped = stopRuns({ provider: 'antigravity' });

    expect(stopped).toHaveLength(1);
    expect(stopped[0]?.provider).toBe('antigravity');
    expect(antigravity).toHaveBeenCalledOnce();
    expect(codex).not.toHaveBeenCalled();
  });

  it('applies session and provider together', () => {
    seed('a', 'codex');

    expect(stopRuns({ sessionId: 'a', provider: 'claude' })).toEqual([]);
  });

  it('returns an empty list when nothing is running', () => {
    expect(stopRuns()).toEqual([]);
  });

  it('reports how long each stopped run had been going', () => {
    seed('a', 'codex');

    const [stopped] = stopRuns();

    expect(stopped?.elapsed_ms).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(stopped?.elapsed_ms)).toBe(true);
  });
});
