import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  commitVisit,
  readFractalMap,
  readTurn,
} from '../../../core/infra/cacheManager/cacheManager.js';
import { handleUserPromptSubmit } from '../../../hooks/userPromptSubmit/userPromptSubmit.js';
import type { UserPromptSubmitInput } from '../../../types/hooks.js';

let tempDir: string;

beforeEach(() => {
  tempDir = join(
    tmpdir(),
    `filid-ups-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(tempDir, { recursive: true });
  process.env.CLAUDE_CONFIG_DIR = tempDir;
});

afterEach(() => {
  delete process.env.CLAUDE_CONFIG_DIR;
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe('handleUserPromptSubmit', () => {
  it('FCA project: clears fmap (sub scopes included), bumps turn, injects context', () => {
    // isFcaProject checks for .filid/ directory or INTENT.md
    mkdirSync(join(tempDir, '.filid'), { recursive: true });

    const sessionId = `session-ups-${Date.now()}`;

    // Pre-populate main and subagent fmaps
    const args = { ownerKey: null, ttlTurns: 5, gateEligible: false };
    commitVisit(tempDir, { sessionId }, { ...args, readKey: 'src/a' });
    commitVisit(
      tempDir,
      { sessionId, sub: 'agent-aprobe-1' },
      { ...args, readKey: 'src/b' },
    );

    expect(readFractalMap(tempDir, { sessionId }).reads).toEqual(['src/a']);
    expect(readTurn(tempDir, sessionId)).toBe(0);

    const input: UserPromptSubmitInput = {
      cwd: tempDir,
      session_id: sessionId,
      hook_event_name: 'UserPromptSubmit',
    };

    const result = handleUserPromptSubmit(input);

    // fmap should be cleared for both scopes; the turn counter advanced
    expect(readFractalMap(tempDir, { sessionId })).toEqual({ reads: [] });
    expect(
      readFractalMap(tempDir, { sessionId, sub: 'agent-aprobe-1' }),
    ).toEqual({ reads: [] });
    expect(readTurn(tempDir, sessionId)).toBe(1);

    // Should still return a valid hook output (from injectContext)
    expect(result.continue).toBe(true);
  });
});
