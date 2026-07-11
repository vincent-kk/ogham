/**
 * @file mcpLifecycle.test.ts
 * @description MCP server lifecycle 유닛 테스트 — bootSweep 오케스트레이션 순서
 * (vaultCommitter 마지막 불변식), registerShutdown 이 shared session-finalizer 에
 * 위임하는 opts(guard=isMaencofVault, detached)와 onShutdown 의 동기 정밀 마감.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { removeSessionFiles } from '../../core/cacheManager/operations/removeSessionFiles.js';
import { removeTurnContext } from '../../core/cacheManager/operations/removeTurnContext.js';
import { sweepStaleSessions } from '../../core/sessionStore/index.js';
import { buildDailyDigest } from '../../core/workIndex/index.js';
import { isMaencofVault } from '../../hooks/shared/isMaencofVault.js';
import { runVaultCommitter } from '../../hooks/utils/vaultCommitter/operations/runVaultCommitter.js';
import {
  bootSweep,
  registerShutdown,
} from '../../mcp/server/lifecycle/index.js';

const calls: string[] = [];

vi.mock('../../core/cacheManager/operations/removeTurnContext.js', () => ({
  removeTurnContext: vi.fn(() => calls.push('turnContext')),
}));
vi.mock('../../core/cacheManager/operations/removeSessionFiles.js', () => ({
  removeSessionFiles: vi.fn(() => calls.push('sessionFiles')),
}));
vi.mock('../../core/sessionStore/index.js', () => ({
  sweepStaleSessions: vi.fn(() => {
    calls.push('sweep');
    return { closed: 1, dates: ['2026-07-11'] };
  }),
}));
vi.mock('../../core/workIndex/index.js', () => ({
  buildDailyDigest: vi.fn((_cwd: string, date: string) =>
    calls.push(`digest:${date}`),
  ),
}));
vi.mock('../../core/personalContext/prunePersonalContext.js', () => ({
  prunePersonalContext: vi.fn(() => calls.push('personalContext')),
}));
vi.mock(
  '../../hooks/utils/changelogDebt/operations/runChangelogDebt.js',
  () => ({
    runChangelogDebt: vi.fn(async () => {
      calls.push('changelogDebt');
      return { continue: true };
    }),
  }),
);
vi.mock('../../hooks/utils/archiveExpired/archiveExpired.js', () => ({
  runArchiveExpired: vi.fn(async () => {
    calls.push('archiveExpired');
    return { continue: true, archived: [], backfilled: [] };
  }),
}));
vi.mock(
  '../../hooks/utils/vaultCommitter/operations/runVaultCommitter.js',
  () => ({
    runVaultCommitter: vi.fn(async () => {
      calls.push('vaultCommitter');
      return { continue: true };
    }),
  }),
);
vi.mock('../../hooks/shared/isMaencofVault.js', () => ({
  isMaencofVault: vi.fn(() => true),
}));

// registerShutdown delegates to the shared runtime — mock it so the test can
// capture the opts (guard/detached) and invoke the onShutdown callback directly.
const { registerShutdownFinalizerMock } = vi.hoisted(() => ({
  registerShutdownFinalizerMock: vi.fn(),
}));
vi.mock('@ogham/session-finalizer', () => ({
  registerShutdownFinalizer: registerShutdownFinalizerMock,
}));

const mockIsVault = vi.mocked(isMaencofVault);
let savedSessionId: string | undefined;

beforeEach(() => {
  calls.length = 0;
  vi.clearAllMocks();
  mockIsVault.mockReturnValue(true);
  savedSessionId = process.env.CLAUDE_CODE_SESSION_ID;
  delete process.env.CLAUDE_CODE_SESSION_ID;
});

afterEach(() => {
  if (savedSessionId === undefined) delete process.env.CLAUDE_CODE_SESSION_ID;
  else process.env.CLAUDE_CODE_SESSION_ID = savedSessionId;
});

describe('bootSweep', () => {
  // Test 1 (basic): full order — commit last so prior outputs ride the commit
  it('runs concerns in the SessionEnd-invariant order, vaultCommitter last', async () => {
    await bootSweep('/vault');

    expect(calls).toEqual([
      'turnContext',
      'sweep',
      'digest:2026-07-11',
      'personalContext',
      'changelogDebt',
      'archiveExpired',
      'vaultCommitter',
    ]);
    expect(vi.mocked(runVaultCommitter)).toHaveBeenCalledWith(
      { cwd: '/vault' },
      'BootSweep',
    );
    expect(vi.mocked(sweepStaleSessions)).toHaveBeenCalledWith(
      '/vault',
      expect.objectContaining({ staleThresholdMs: expect.any(Number) }),
    );
    expect(vi.mocked(buildDailyDigest)).toHaveBeenCalledWith(
      '/vault',
      '2026-07-11',
    );
  });

  // Test 2 (complex): non-vault cwd → nothing runs
  it('is a no-op outside a maencof vault', async () => {
    mockIsVault.mockReturnValue(false);
    await bootSweep('/not-a-vault');
    expect(calls).toEqual([]);
  });

  // Test 3 (complex): a throwing concern is absorbed (boot never fails)
  it('absorbs concern failures instead of throwing', async () => {
    vi.mocked(removeTurnContext).mockImplementationOnce(() => {
      throw new Error('disk');
    });
    await expect(bootSweep('/vault')).resolves.toBeUndefined();
  });
});

describe('registerShutdown', () => {
  // Test 4 (complex): delegates to the shared finalizer with the right opts
  it('delegates to the shared finalizer (guard=isMaencofVault, detached)', () => {
    registerShutdown('/vault');

    expect(registerShutdownFinalizerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ctx: '/vault',
        guard: isMaencofVault,
        detached: true,
        onShutdown: expect.any(Function),
      }),
    );
  });

  // Test 5 (complex): onShutdown closes exactly the env session, else turn-context only
  it('onShutdown closes exactly the env session, turn-context only without it', () => {
    registerShutdown('/vault');
    const opts = registerShutdownFinalizerMock.mock.calls.at(-1)?.[0] as {
      onShutdown: (v: string) => void;
    };

    process.env.CLAUDE_CODE_SESSION_ID = 'own-session';
    opts.onShutdown('/vault');
    expect(calls).toEqual([
      'turnContext',
      'sweep',
      'digest:2026-07-11',
      'sessionFiles',
    ]);
    expect(vi.mocked(sweepStaleSessions)).toHaveBeenCalledWith('/vault', {
      staleThresholdMs: 0,
      sessionId: 'own-session',
    });
    expect(vi.mocked(buildDailyDigest)).toHaveBeenCalledWith(
      '/vault',
      '2026-07-11',
    );
    expect(vi.mocked(removeSessionFiles)).toHaveBeenCalledWith(
      'own-session',
      '/vault',
    );

    // without the env var only turn-context is cleaned (sweep deferred to boot)
    calls.length = 0;
    delete process.env.CLAUDE_CODE_SESSION_ID;
    opts.onShutdown('/vault');
    expect(calls).toEqual(['turnContext']);
  });
});
