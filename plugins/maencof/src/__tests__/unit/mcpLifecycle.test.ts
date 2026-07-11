/**
 * @file mcpLifecycle.test.ts
 * @description MCP server lifecycle 유닛 테스트 — bootSweep 오케스트레이션 순서
 * (vaultCommitter 마지막 불변식)와 registerShutdown 의 동기 정밀 마감 경로.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { removeSessionFiles } from '../../core/cacheManager/operations/removeSessionFiles.js';
import { removeTurnContext } from '../../core/cacheManager/operations/removeTurnContext.js';
import { sweepStaleSessions } from '../../core/sessionStore/index.js';
import { buildDailyDigest } from '../../core/workIndex/index.js';
import { isMaencofVault } from '../../hooks/shared/isMaencofVault.js';
import { runVaultCommitter } from '../../hooks/utils/vaultCommitter/operations/runVaultCommitter.js';
import { bootSweep } from '../../mcp/server/lifecycle/bootSweep.js';
import { registerShutdown } from '../../mcp/server/lifecycle/registerShutdown.js';

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
  // Test 4 (complex): registration is once-only; handler does precise close
  it('registers once and the handler closes exactly the env session', () => {
    const before = {
      exit: process.listeners('exit'),
      sigint: process.listeners('SIGINT'),
      sigterm: process.listeners('SIGTERM'),
    };

    registerShutdown('/vault');
    registerShutdown('/vault');

    const added = {
      exit: process.listeners('exit').filter((l) => !before.exit.includes(l)),
      sigint: process
        .listeners('SIGINT')
        .filter((l) => !before.sigint.includes(l)),
      sigterm: process
        .listeners('SIGTERM')
        .filter((l) => !before.sigterm.includes(l)),
    };
    expect(added.exit).toHaveLength(1);
    expect(added.sigint).toHaveLength(1);
    expect(added.sigterm).toHaveLength(1);

    // invoke the exit handler directly (it never calls process.exit itself)
    process.env.CLAUDE_CODE_SESSION_ID = 'own-session';
    (added.exit[0] as () => void)();

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
    (added.exit[0] as () => void)();
    expect(calls).toEqual(['turnContext']);

    for (const l of added.exit) process.removeListener('exit', l);
    for (const l of added.sigint) process.removeListener('SIGINT', l);
    for (const l of added.sigterm) process.removeListener('SIGTERM', l);
  });
});
