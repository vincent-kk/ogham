import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { orchestratePostToolUse } from '../postToolUse/postToolUse.js';
import {
  orchestratePreToolUse,
  orchestratePreToolUseBatch,
} from '../preToolUse/preToolUse.js';
import { runLifecycleDispatcher } from '../utils/lifecycleDispatcher/lifecycleDispatcher.js';
import { safeConcern } from '../utils/safeConcern/safeConcern.js';

vi.mock('../utils/lifecycleDispatcher/lifecycleDispatcher.js', () => ({
  runLifecycleDispatcher: vi.fn(() => ({ continue: true })),
}));

let vaultDir: string;
let cacheDir: string;

beforeEach(() => {
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  vaultDir = join(tmpdir(), `maencof-dispatch-${tag}`);
  cacheDir = join(tmpdir(), `maencof-dispatch-cache-${tag}`);
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
  mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
  vi.stubEnv('CLAUDE_CONFIG_DIR', cacheDir);
  vi.mocked(runLifecycleDispatcher).mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('orchestratePreToolUse', () => {
  it('non-vault → bare continue:true', () => {
    const result = orchestratePreToolUse({
      cwd: '/nonexistent/path',
      tool_name: 'Write',
      tool_input: { file_path: '01_Core/identity.md' },
    });
    expect(result).toEqual({ continue: true });
  });

  it('Write to 01_Core blocks (layerGuard route + merge)', () => {
    const result = orchestratePreToolUse({
      cwd: vaultDir,
      tool_name: 'Write',
      tool_input: { file_path: '01_Core/identity.md' },
    });
    expect(result.continue).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('Write to a non-L1 path is allowed', () => {
    const result = orchestratePreToolUse({
      cwd: vaultDir,
      tool_name: 'Write',
      tool_input: { file_path: 'L3/note.md' },
    });
    expect(result.continue).toBe(true);
  });

  it('a later L1 operation denies the whole ordered batch and lifecycle runs once', () => {
    const original = {
      cwd: vaultDir,
      tool_name: 'apply_patch',
      tool_input: { command: 'physical patch' },
    };
    const first = {
      ...original,
      tool_name: 'Edit',
      tool_input: { file_path: 'L3/note.md' },
    };
    const second = {
      ...original,
      tool_name: 'Edit',
      tool_input: { file_path: '01_Core/identity.md' },
    };

    const result = orchestratePreToolUseBatch({
      ok: true,
      original,
      toolUses: [first, second],
    });

    expect(result.continue).toBe(false);
    expect(result.reason).toContain('01_Core/identity.md');
    expect(runLifecycleDispatcher).toHaveBeenCalledOnce();
    expect(runLifecycleDispatcher).toHaveBeenCalledWith('PreToolUse', first);
  });

  it('continues after an initial L1 deny and preserves a later L1 reason', () => {
    const original = {
      cwd: vaultDir,
      tool_name: 'apply_patch',
      tool_input: { command: 'physical patch' },
    };
    const first = {
      ...original,
      tool_name: 'Delete',
      tool_input: { file_path: '01_Core/identity.md' },
    };
    const second = {
      ...original,
      tool_name: 'Delete',
      tool_input: { file_path: '01_Core/values.md' },
    };

    const result = orchestratePreToolUseBatch({
      ok: true,
      original,
      toolUses: [first, second],
    });

    expect(result.continue).toBe(false);
    expect(result.reason).toContain('01_Core/identity.md');
    expect(result.reason).toContain('01_Core/values.md');
    expect(runLifecycleDispatcher).toHaveBeenCalledOnce();
    expect(runLifecycleDispatcher).toHaveBeenCalledWith('PreToolUse', first);
  });

  it('Delete of a Layer 1 path uses the mutation guard', () => {
    const result = orchestratePreToolUse({
      cwd: vaultDir,
      tool_name: 'Delete',
      tool_input: { file_path: '01_Core/identity.md' },
    });

    expect(result.continue).toBe(false);
    expect(result.reason).toContain('01_Core/identity.md');
  });

  it('malformed apply_patch in a vault denies after one lifecycle call with original', () => {
    const original = {
      cwd: vaultDir,
      tool_name: 'apply_patch',
      tool_input: { command: 'malformed patch' },
    };

    const result = orchestratePreToolUseBatch({
      ok: false,
      original,
      reason: 'Invalid apply_patch command',
    });

    expect(result).toMatchObject({
      continue: false,
      reason: 'Invalid apply_patch command',
    });
    expect(runLifecycleDispatcher).toHaveBeenCalledOnce();
    expect(runLifecycleDispatcher).toHaveBeenCalledWith('PreToolUse', original);
  });

  it('malformed apply_patch outside a vault passes after one lifecycle call with original', () => {
    const original = {
      cwd: '/nonexistent/path',
      tool_name: 'apply_patch',
      tool_input: { command: 'malformed patch' },
    };

    const result = orchestratePreToolUseBatch({
      ok: false,
      original,
      reason: 'Invalid apply_patch command',
    });

    expect(result).toEqual({ continue: true });
    expect(runLifecycleDispatcher).toHaveBeenCalledOnce();
    expect(runLifecycleDispatcher).toHaveBeenCalledWith('PreToolUse', original);
  });

  it('malformed apply_patch from a vault subdirectory still denies', () => {
    const nestedCwd = join(vaultDir, 'L3', 'project');
    mkdirSync(nestedCwd, { recursive: true });
    const original = {
      cwd: nestedCwd,
      tool_name: 'apply_patch',
      tool_input: { command: 'malformed patch' },
    };

    const result = orchestratePreToolUseBatch({
      ok: false,
      original,
      reason: 'Invalid apply_patch command',
    });

    expect(result.continue).toBe(false);
    expect(runLifecycleDispatcher).toHaveBeenCalledOnce();
    expect(runLifecycleDispatcher).toHaveBeenCalledWith('PreToolUse', original);
  });

  it('Read of a vault .md emits the redirect advisory (vaultRedirector route)', () => {
    const result = orchestratePreToolUse({
      cwd: vaultDir,
      tool_name: 'Read',
      tool_input: { file_path: 'L3/note.md' },
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toBeTruthy();
  });

  it('Read of 01_Core never blocks (layerGuard is mutation-only)', () => {
    const result = orchestratePreToolUse({
      cwd: vaultDir,
      tool_name: 'Read',
      tool_input: { file_path: '01_Core/identity.md' },
    });
    expect(result.continue).toBe(true);
  });
});

describe('orchestratePostToolUse', () => {
  it('records an MCP write tool (create) to the activity log', () => {
    const result = orchestratePostToolUse({
      cwd: vaultDir,
      tool_name: 'create',
      tool_input: { path: 'L3/note.md' },
      tool_response: {},
    });
    expect(result.continue).toBe(true);
    const eventsDir = join(vaultDir, '.maencof-meta', 'activity', 'events');
    expect(existsSync(eventsDir)).toBe(true);
    expect(readdirSync(eventsDir).length).toBeGreaterThan(0);
  });

  it('does NOT record a non-allowlisted tool (Read) — allowlist gate', () => {
    orchestratePostToolUse({
      cwd: vaultDir,
      tool_name: 'Read',
      tool_input: { path: 'L3/note.md' },
      tool_response: {},
    });
    const eventsDir = join(vaultDir, '.maencof-meta', 'activity', 'events');
    expect(existsSync(eventsDir)).toBe(false);
  });

  it('non-vault → bare continue:true', () => {
    const result = orchestratePostToolUse({
      cwd: '/nonexistent/path',
      tool_name: 'create',
      tool_input: {},
    });
    expect(result).toEqual({ continue: true });
  });
});

describe('safeConcern isolation', () => {
  it('a throwing concern degrades to continue:true', () => {
    const result = safeConcern(vaultDir, 'boom', () => {
      throw new Error('kaboom');
    });
    expect(result).toEqual({ continue: true });
  });

  it('a successful concern result passes through unchanged', () => {
    const result = safeConcern(vaultDir, 'ok', () => ({
      continue: false,
      reason: 'x',
    }));
    expect(result).toEqual({ continue: false, reason: 'x' });
  });
});
