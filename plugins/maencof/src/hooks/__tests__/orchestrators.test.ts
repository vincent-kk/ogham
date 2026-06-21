import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { orchestratePostToolUse } from '../postToolUse/postToolUse.js';
import { orchestratePreToolUse } from '../preToolUse/preToolUse.js';
import { orchestrateSessionEnd } from '../sessionEnd/sessionEnd.js';
import { safeConcern } from '../utils/safeConcern.js';

let vaultDir: string;
let cacheDir: string;

beforeEach(() => {
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  vaultDir = join(tmpdir(), `maencof-dispatch-${tag}`);
  cacheDir = join(tmpdir(), `maencof-dispatch-cache-${tag}`);
  mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
  vi.stubEnv('CLAUDE_CONFIG_DIR', cacheDir);
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

  it('Read of a vault .md emits the redirect advisory (vaultRedirector route)', () => {
    const result = orchestratePreToolUse({
      cwd: vaultDir,
      tool_name: 'Read',
      tool_input: { file_path: 'L3/note.md' },
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toBeTruthy();
  });

  it('Read of 01_Core never blocks (layerGuard is Write|Edit only)', () => {
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

describe('orchestrateSessionEnd', () => {
  it('non-vault → bare continue:true', async () => {
    const result = await orchestrateSessionEnd({
      cwd: '/nonexistent/path',
      session_id: 's',
    });
    expect(result).toEqual({ continue: true });
  });

  it('in a vault never blocks session exit', async () => {
    const result = await orchestrateSessionEnd({
      cwd: vaultDir,
      session_id: 's',
      skills_used: [],
      files_modified: [],
    });
    expect(result.continue).toBe(true);
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
