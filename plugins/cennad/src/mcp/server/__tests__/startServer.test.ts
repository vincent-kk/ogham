import { afterEach, describe, expect, it, vi } from 'vitest';

import { runLedger } from '../../../dispatcher/activeRuns/runLedger.js';
import { startServer } from '../lifecycle/startServer.js';

const finalizerOptions = vi.hoisted(
  () => ({ current: null }) as { current: { onShutdown?: () => void } | null },
);

vi.mock('@ogham/session-finalizer', () => ({
  registerShutdownFinalizer: (options: { onShutdown?: () => void }) => {
    finalizerOptions.current = options;
  },
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));

vi.mock('../lifecycle/createServer.js', () => ({
  createServer: () => ({ connect: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('../../../core/configManager/index.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({ session_ttl_hours: 24 }),
}));

vi.mock('../../../core/sessionStore/index.js', () => ({
  pruneExpired: vi.fn().mockResolvedValue(0),
}));

afterEach(() => {
  runLedger.clear();
  finalizerOptions.current = null;
});

describe('startServer shutdown sweep', () => {
  // On POSIX a spawned CLI is reparented when the server exits, so without this
  // handler every in-flight provider run outlives the session that asked for it.
  it('kills in-flight runs when the process is shutting down', async () => {
    await startServer('test');
    const abort = vi.fn();
    runLedger.add({
      sessionId: 'a',
      provider: 'codex',
      startedAt: performance.now(),
      abort,
    });

    finalizerOptions.current?.onShutdown?.();

    expect(abort).toHaveBeenCalledOnce();
  });

  it('registers a synchronous handler — the host SIGKILLs ~400ms after the signal', async () => {
    await startServer('test');

    const returned = finalizerOptions.current?.onShutdown?.();

    expect(returned).toBeUndefined();
  });
});
