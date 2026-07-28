import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleUserPromptSubmit } from '../userPromptSubmit.js';

let root: string;

function makeProject(branch: string): void {
  mkdirSync(join(root, '.filid'), { recursive: true });
  writeFileSync(join(root, '.filid', 'config.json'), '{}');
  mkdirSync(join(root, '.git'), { recursive: true });
  writeFileSync(join(root, '.git', 'HEAD'), `ref: refs/heads/${branch}\n`);
}

function submit(): string {
  const result = handleUserPromptSubmit({
    cwd: root,
    session_id: 'ups-spike-session',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'hello',
  });
  expect(result.continue).toBe(true);
  return result.hookSpecificOutput?.additionalContext ?? '';
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-ups-'));
  process.env.CLAUDE_CONFIG_DIR = join(root, 'claude-home');
});

afterEach(() => {
  delete process.env.CLAUDE_CONFIG_DIR;
  rmSync(root, { recursive: true, force: true });
});

describe('handleUserPromptSubmit — session-first context', () => {
  it('keeps the session-first gate on normal branches (second prompt is silent)', () => {
    makeProject('main');
    expect(submit()).toContain('[filid:lang]');
    expect(submit()).toBe('');
  });

  it('keeps spike branches on the same session-first FCA context', () => {
    makeProject('spike/poc');
    const first = submit();
    expect(first).toContain('[filid:lang]');
    expect(first).not.toContain('[filid:spike]');
  });

  it('keeps the second spike-branch prompt silent', () => {
    makeProject('spike/poc');
    submit();
    expect(submit()).toBe('');
  });
});
