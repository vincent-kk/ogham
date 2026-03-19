import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionStartInput } from '../../../types/hooks.js';

// Mock node:fs for isFcaProject + getCacheDir control
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
    mkdirSync: vi.fn(),
    copyFileSync: vi.fn(),
  };
});

// Mock cache-manager to control getCacheDir and pruneOldSessions
vi.mock('../../../core/infra/cache-manager.js', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../../../core/infra/cache-manager.js')
    >();
  return {
    ...actual,
    getCacheDir: vi.fn(actual.getCacheDir),
    pruneOldSessions: vi.fn(),
    pruneStaleCacheDirs: vi.fn(),
  };
});

const { processSetup } = await import('../../../hooks/setup.js');
const { existsSync: mockExistsSync, mkdirSync: mockMkdirSync } =
  await import('node:fs');
const { getCacheDir, pruneOldSessions } =
  await import('../../../core/infra/cache-manager.js');

const baseInput: SessionStartInput = {
  cwd: '/tmp/test-workspace',
  session_id: 'test-session-123',
  hook_event_name: 'SessionStart',
};

describe('processSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { continue: true } on success', () => {
    (getCacheDir as ReturnType<typeof vi.fn>).mockReturnValue(
      '/tmp/filid-cache',
    );
    (mockExistsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const result = processSetup(baseInput);

    expect(result.continue).toBe(true);
  });

  it('calls getCacheDir with input cwd', () => {
    (getCacheDir as ReturnType<typeof vi.fn>).mockReturnValue(
      '/tmp/filid-cache',
    );
    (mockExistsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

    processSetup(baseInput);

    expect(getCacheDir).toHaveBeenCalledWith('/tmp/test-workspace');
  });

  it('creates cache directory when missing', () => {
    (getCacheDir as ReturnType<typeof vi.fn>).mockReturnValue(
      '/tmp/filid-cache-new',
    );
    (mockExistsSync as ReturnType<typeof vi.fn>).mockImplementation(
      (p: unknown) => {
        if (p === '/tmp/filid-cache-new') return false; // cache dir missing
        return false; // non-FCA
      },
    );

    processSetup(baseInput);

    expect(mockMkdirSync).toHaveBeenCalledWith('/tmp/filid-cache-new', {
      recursive: true,
    });
  });

  it('calls pruneOldSessions for maintenance', () => {
    (getCacheDir as ReturnType<typeof vi.fn>).mockReturnValue(
      '/tmp/filid-cache',
    );
    (mockExistsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

    processSetup(baseInput);

    expect(pruneOldSessions).toHaveBeenCalledWith('/tmp/test-workspace');
  });

  it('returns additionalContext for FCA projects', () => {
    (getCacheDir as ReturnType<typeof vi.fn>).mockReturnValue(
      '/tmp/filid-cache',
    );
    (mockExistsSync as ReturnType<typeof vi.fn>).mockImplementation(
      (p: unknown) => {
        if (typeof p === 'string' && p.endsWith('.filid')) return true;
        return true;
      },
    );

    const result = processSetup(baseInput);

    expect(result.hookSpecificOutput?.additionalContext).toContain('[filid]');
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'FCA project: yes',
    );
  });

  it('returns no additionalContext for non-FCA projects', () => {
    (getCacheDir as ReturnType<typeof vi.fn>).mockReturnValue(
      '/tmp/filid-cache',
    );
    (mockExistsSync as ReturnType<typeof vi.fn>).mockImplementation(
      (p: unknown) => {
        if (
          typeof p === 'string' &&
          (p.endsWith('.filid') || p.endsWith('INTENT.md'))
        )
          return false;
        return true;
      },
    );

    const result = processSetup(baseInput);

    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('returns { continue: true } when getCacheDir throws', () => {
    (getCacheDir as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('disk full');
    });

    const result = processSetup(baseInput);

    expect(result.continue).toBe(true);
  });

  it('returns { continue: true } when pruneOldSessions throws', () => {
    (getCacheDir as ReturnType<typeof vi.fn>).mockReturnValue(
      '/tmp/filid-cache',
    );
    (mockExistsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (pruneOldSessions as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('permission denied');
    });

    const result = processSetup(baseInput);

    expect(result.continue).toBe(true);
  });

  // ensureFcaRules is tested thoroughly in config-loader.test.ts (initProject, ensureFcaRules).
  // setup.ts integration: existing "returns additionalContext for FCA projects" test verifies
  // the FCA code path works end-to-end including the ensureFcaRules call (which is a no-op
  // when existsSync returns true for fca.md).
});
