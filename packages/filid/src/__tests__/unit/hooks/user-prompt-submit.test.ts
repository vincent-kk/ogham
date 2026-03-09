import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readFractalMap, writeFractalMap } from '../../../core/cache-manager.js';
import { handleUserPromptSubmit } from '../../../hooks/user-prompt-submit.js';
import type { UserPromptSubmitInput } from '../../../types/hooks.js';

let tempDir: string;

beforeEach(() => {
  tempDir = join(tmpdir(), `filid-ups-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
  it('FCA project: clears fmap then injects context', () => {
    // isFcaProject checks for .filid/ directory or INTENT.md
    mkdirSync(join(tempDir, '.filid'), { recursive: true });

    const sessionId = `session-ups-${Date.now()}`;

    // Pre-populate fmap
    writeFractalMap(tempDir, sessionId, {
      reads: ['src/a', 'src/b'],
      intents: ['src/a'],
      details: [],
    });

    // Verify fmap exists
    expect(readFractalMap(tempDir, sessionId).reads).toEqual(['src/a', 'src/b']);

    const input: UserPromptSubmitInput = {
      cwd: tempDir,
      session_id: sessionId,
      hook_event_name: 'UserPromptSubmit',
    };

    const result = handleUserPromptSubmit(input);

    // fmap should be cleared
    expect(readFractalMap(tempDir, sessionId)).toEqual({ reads: [], intents: [], details: [] });

    // Should still return a valid hook output (from injectContext)
    expect(result.continue).toBe(true);
  });
});
