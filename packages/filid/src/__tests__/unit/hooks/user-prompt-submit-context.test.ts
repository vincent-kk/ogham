import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserPromptSubmitInput } from '../../../types/hooks.js';

// Default existsSync behavior:
//   .filid path               → true  (passes isFcaProject gate)
//   .filid/config.json        → true  (config present)
//   .claude/rules/filid_fca-policy.md      → true  (rules deployed, active pointer)
//   /prompt-context-*         → false (no cached context = triggers fresh build)
//   others                    → false
//
// readFileSync returns a valid minimal config when `.filid/config.json` is
// requested so loadConfig resolves to a non-null value; everything else
// throws (unexpected reads are test errors).
const MOCK_CONFIG_JSON = JSON.stringify({ version: '1.0', rules: {} });

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn((p: unknown) => {
      if (typeof p !== 'string') return false;
      if (p.endsWith('.filid')) return true;
      if (p.endsWith('.filid/config.json')) return true;
      if (p.endsWith('.claude/rules/filid_fca-policy.md')) return true;
      if (p.includes('/prompt-context-')) return false;
      return false;
    }),
    statSync: vi.fn(() => {
      throw new Error('no cache');
    }),
    readFileSync: vi.fn((p: unknown) => {
      if (typeof p === 'string' && p.endsWith('.filid/config.json')) {
        return MOCK_CONFIG_JSON;
      }
      throw new Error(`unexpected readFileSync: ${String(p)}`);
    }),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(() => []),
    unlinkSync: vi.fn(),
  };
});

const { handleUserPromptSubmit } = await import(
  '../../../hooks/user-prompt-submit/user-prompt-submit.js'
);
const { existsSync, readdirSync } = await import('node:fs');

const baseInput: UserPromptSubmitInput = {
  cwd: '/workspace/project',
  session_id: 'test-session',
  hook_event_name: 'UserPromptSubmit',
  prompt: 'test prompt',
};

describe('user-prompt-submit context injection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (existsSync as ReturnType<typeof vi.fn>).mockImplementation(
      (p: unknown) => {
        if (typeof p !== 'string') return false;
        if (p.endsWith('.filid')) return true;
        if (p.endsWith('.filid/config.json')) return true;
        if (p.endsWith('.claude/rules/filid_fca-policy.md')) return true;
        if (p.includes('/prompt-context-')) return false;
        return false;
      },
    );
  });

  it('injects minimal FCA-AI pointer', () => {
    const result = handleUserPromptSubmit(baseInput);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toBeDefined();
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      '[filid] FCA-AI active. Rules: .claude/rules/filid_fca-policy.md',
    );
  });

  it('does not contain verbose rules content', () => {
    const result = handleUserPromptSubmit(baseInput);
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).not.toContain('Directory Structure');
    expect(ctx).not.toContain('Development Workflow');
    expect(ctx).not.toContain('Category Classification');
    expect(ctx).not.toContain('nearest common ancestor');
  });

  it('always continues (never blocks user prompts)', () => {
    expect(handleUserPromptSubmit(baseInput).continue).toBe(true);
  });

  it('skips context injection for non-FCA projects', () => {
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const result = handleUserPromptSubmit(baseInput);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('warns when .filid/config.json is missing (not initialized)', () => {
    (existsSync as ReturnType<typeof vi.fn>).mockImplementation(
      (p: unknown) => {
        if (typeof p !== 'string') return false;
        if (p.endsWith('.filid')) return true;
        if (p.endsWith('.filid/config.json')) return false;
        if (p.endsWith('.claude/rules/filid_fca-policy.md')) return false;
        if (p.includes('/prompt-context-')) return false;
        return false;
      },
    );

    const ctx =
      handleUserPromptSubmit(baseInput).hookSpecificOutput?.additionalContext ??
      '';
    expect(ctx).toContain('Not initialized');
    expect(ctx).toContain('/filid:filid-setup');
    expect(ctx).not.toContain('FCA-AI active');
  });

  it('warns when rule doc is missing but config is present', () => {
    (existsSync as ReturnType<typeof vi.fn>).mockImplementation(
      (p: unknown) => {
        if (typeof p !== 'string') return false;
        if (p.endsWith('.filid')) return true;
        if (p.endsWith('.filid/config.json')) return true;
        if (p.endsWith('.claude/rules/filid_fca-policy.md')) return false;
        if (p.includes('/prompt-context-')) return false;
        return false;
      },
    );

    const ctx =
      handleUserPromptSubmit(baseInput).hookSpecificOutput?.additionalContext ??
      '';
    expect(ctx).toContain('Rules not deployed');
    expect(ctx).toContain('/filid:filid-setup');
    expect(ctx).not.toContain('FCA-AI active');
  });

  it('does not inject when prompt-context exists', () => {
    (existsSync as ReturnType<typeof vi.fn>).mockImplementation(
      (p: unknown) => {
        if (typeof p === 'string' && p.endsWith('.filid')) return true;
        if (typeof p === 'string' && p.includes('/session-context-'))
          return true;
        if (typeof p === 'string' && p.includes('/prompt-context-'))
          return true;
        return false;
      },
    );

    const result = handleUserPromptSubmit(baseInput);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('re-injects when prompt-context is missing', () => {
    const result = handleUserPromptSubmit(baseInput);
    expect(result.hookSpecificOutput?.additionalContext).toContain('FCA-AI');
  });

  it('injects independently for different session IDs', () => {
    const r1 = handleUserPromptSubmit({ ...baseInput, session_id: 'a' });
    const r2 = handleUserPromptSubmit({ ...baseInput, session_id: 'b' });
    expect(r1.hookSpecificOutput?.additionalContext).toBeDefined();
    expect(r2.hookSpecificOutput?.additionalContext).toBeDefined();
  });

  it('safely injects when prompt-context I/O fails', () => {
    (existsSync as ReturnType<typeof vi.fn>).mockImplementation(
      (p: unknown) => {
        if (typeof p === 'string' && p.endsWith('.filid')) return true;
        if (typeof p === 'string' && p.includes('/prompt-context-'))
          throw new Error('fs error');
        return false;
      },
    );

    const result = handleUserPromptSubmit(baseInput);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toBeDefined();
  });

  it('calls readdirSync after markSessionInjected (pruneOldSessions invoked)', () => {
    handleUserPromptSubmit(baseInput);
    expect(readdirSync).toHaveBeenCalled();
  });

  it('outputs at most 3 lines for default config', () => {
    const ctx =
      handleUserPromptSubmit(baseInput).hookSpecificOutput?.additionalContext ??
      '';
    const lines = ctx.split('\n').filter((l: string) => l.trim() !== '');
    expect(lines.length).toBeLessThanOrEqual(3);
    expect(lines[0]).toBe(
      '[filid] FCA-AI active. Rules: .claude/rules/filid_fca-policy.md',
    );
  });

  it('includes [filid:lang] tag in injected context', () => {
    const ctx =
      handleUserPromptSubmit(baseInput).hookSpecificOutput?.additionalContext ??
      '';
    expect(ctx).toContain('[filid:lang]');
  });

  it('defaults [filid:lang] to en when no config language is set', () => {
    const ctx =
      handleUserPromptSubmit(baseInput).hookSpecificOutput?.additionalContext ??
      '';
    expect(ctx).toContain('[filid:lang] en');
  });
});
