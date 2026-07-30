import { afterEach, describe, expect, it, vi } from 'vitest';

import { runLedger } from '../../../../dispatcher/activeRuns/runLedger.js';
import type { Provider } from '../../../../types/index.js';
import { handleStopConversation } from '../stopConversation.js';

function seed(sessionId: string, provider: Provider): () => void {
  const abort = vi.fn();
  runLedger.set(sessionId, {
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

describe('handleStopConversation', () => {
  it('stops every in-flight run when neither filter is given', () => {
    const codex = seed('a', 'codex');
    const claude = seed('b', 'claude');

    const out = handleStopConversation({});

    expect(out.count).toBe(2);
    expect(out.stopped.map((run) => run.session_id).sort()).toEqual(['a', 'b']);
    expect(codex).toHaveBeenCalledOnce();
    expect(claude).toHaveBeenCalledOnce();
  });

  it('stops only the named session', () => {
    const wanted = seed('a', 'codex');
    const other = seed('b', 'antigravity');

    const out = handleStopConversation({ session_id: 'a' });

    expect(out.count).toBe(1);
    expect(out.stopped[0]?.session_id).toBe('a');
    expect(wanted).toHaveBeenCalledOnce();
    expect(other).not.toHaveBeenCalled();
  });

  it('stops only the named provider', () => {
    const codex = seed('a', 'codex');
    const antigravity = seed('b', 'antigravity');

    const out = handleStopConversation({ provider: 'antigravity' });

    expect(out.count).toBe(1);
    expect(antigravity).toHaveBeenCalledOnce();
    expect(codex).not.toHaveBeenCalled();
  });

  // Nothing to stop is the ordinary outcome of a run that already finished, so
  // it reports zero rather than failing — and says why zero is not an error.
  it('reports zero without failing when nothing matches', () => {
    const out = handleStopConversation({ session_id: 'gone' });

    expect(out.count).toBe(0);
    expect(out.stopped).toEqual([]);
    expect(out.message).toMatch(/no .*run/i);
  });

  it('names how many runs it killed', () => {
    seed('a', 'codex');

    expect(handleStopConversation({}).message).toContain('1');
  });
});
