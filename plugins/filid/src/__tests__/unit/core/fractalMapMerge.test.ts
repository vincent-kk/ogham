import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getCacheDir,
  readFractalMap,
  removeFractalMap,
  writeFractalMap,
} from '../../../core/infra/cacheManager/cacheManager.js';

// writeFractalMap merge + atomic-swap behavior. Hook events run as
// concurrent short-lived processes; the plain overwrite this replaces lost
// sibling first-visit records under parallel Read batches.

let tempDir: string;

beforeEach(() => {
  tempDir = join(
    tmpdir(),
    `filid-fmap-merge-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(tempDir, { recursive: true });
  process.env.CLAUDE_CONFIG_DIR = tempDir;
});

afterEach(() => {
  delete process.env.CLAUDE_CONFIG_DIR;
  rmSync(tempDir, { recursive: true, force: true });
});

describe('writeFractalMap merge + atomic swap', () => {
  it('lost-update regression: divergent writes from the same base both survive', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-race';

    // Two hook processes read the same (empty) base, then each writes its
    // own visit — the second write must not erase the first.
    const processA = readFractalMap(cwd, sessionId);
    const processB = readFractalMap(cwd, sessionId);
    processA.reads.push('src/core');
    processA.intents.push('src/core');
    processB.reads.push('src/ast');
    processB.intents.push('src/ast');

    writeFractalMap(cwd, sessionId, processA);
    writeFractalMap(cwd, sessionId, processB);

    const merged = readFractalMap(cwd, sessionId);
    expect(merged.reads).toEqual(['src/core', 'src/ast']);
    expect(merged.intents).toEqual(['src/core', 'src/ast']);
  });

  it('leaves no tmp residue after a write', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-tmp';

    writeFractalMap(cwd, sessionId, {
      reads: ['src'],
      intents: ['src'],
      details: [],
    });

    const leftover = readdirSync(getCacheDir(cwd)).filter((f) =>
      f.endsWith('.tmp'),
    );
    expect(leftover).toEqual([]);
  });

  it('removeFractalMap resets the merge base (per-turn reset preserved)', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-reset';

    writeFractalMap(cwd, sessionId, {
      reads: ['stale'],
      intents: ['stale'],
      details: [],
    });
    removeFractalMap(cwd, sessionId);
    writeFractalMap(cwd, sessionId, {
      reads: ['fresh'],
      intents: [],
      details: [],
    });

    expect(readFractalMap(cwd, sessionId)).toEqual({
      reads: ['fresh'],
      intents: [],
      details: [],
    });
  });
});
