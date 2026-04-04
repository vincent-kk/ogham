import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getCacheDir,
  hasGuideInjected,
  markGuideInjected,
  readBoundary,
  readFractalMap,
  removeFractalMap,
  removeSessionFiles,
  sessionIdHash,
  writeBoundary,
  writeFractalMap,
} from '../../../core/infra/cache-manager/cache-manager.js';

let tempDir: string;

beforeEach(() => {
  tempDir = join(
    tmpdir(),
    `filid-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(tempDir, { recursive: true });
  // Override CLAUDE_CONFIG_DIR to isolate tests
  process.env.CLAUDE_CONFIG_DIR = tempDir;
});

afterEach(() => {
  delete process.env.CLAUDE_CONFIG_DIR;
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup failures
  }
});

describe('cache-manager boundary/fmap extensions', () => {
  // Test 1: writeBoundary → readBoundary roundtrip
  it('writeBoundary → readBoundary: returns written boundary path', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-001';
    const dir = '/proj/workspace/src/payments';
    const boundaryPath = '/proj/workspace';

    writeBoundary(cwd, sessionId, dir, boundaryPath);
    const result = readBoundary(cwd, sessionId, dir);

    expect(result).toBe(boundaryPath);
  });

  // Test 2: writeFractalMap → readFractalMap roundtrip
  it('writeFractalMap → readFractalMap: returns written map', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-002';
    const map = {
      reads: ['src/payments', 'src/auth'],
      intents: ['src/payments'],
      details: [],
    };

    writeFractalMap(cwd, sessionId, map);
    const result = readFractalMap(cwd, sessionId);

    expect(result).toEqual(map);
  });

  // Test 3: fmap intents dedup — roundtrip preserves data
  it('writeFractalMap → readFractalMap: preserves intents and details arrays', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-003';
    const map = {
      reads: ['src/checkout', 'src/refund', 'src/auth'],
      intents: ['src/checkout', 'src/auth'],
      details: ['src/checkout'],
    };

    writeFractalMap(cwd, sessionId, map);
    const result = readFractalMap(cwd, sessionId);

    expect(result.reads).toHaveLength(3);
    expect(result.intents).toHaveLength(2);
    expect(result.details).toHaveLength(1);
    expect(result.intents).toContain('src/checkout');
    expect(result.intents).toContain('src/auth');
  });

  // Test 4: removeSessionFiles cleanup
  it('removeSessionFiles: removes boundary and fmap files', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-004';
    const dir = '/proj/workspace/src';

    writeBoundary(cwd, sessionId, dir, cwd);
    writeFractalMap(cwd, sessionId, {
      reads: ['src'],
      intents: [],
      details: [],
    });

    // Verify files were written
    expect(readBoundary(cwd, sessionId, dir)).toBe(cwd);
    expect(readFractalMap(cwd, sessionId).reads).toEqual(['src']);

    removeSessionFiles(sessionId, cwd);

    // After cleanup, reads should return defaults
    expect(readBoundary(cwd, sessionId, dir)).toBeNull();
    expect(readFractalMap(cwd, sessionId)).toEqual({
      reads: [],
      intents: [],
      details: [],
    });
  });

  // Test 5: Session isolation — different sessionIds do not share cache
  it('session isolation: different sessionIds have independent caches', () => {
    const cwd = '/proj/workspace';
    const sessionA = 'session-A';
    const sessionB = 'session-B';
    const dir = '/proj/workspace/src';

    writeBoundary(cwd, sessionA, dir, '/proj/workspace');
    writeFractalMap(cwd, sessionA, {
      reads: ['src'],
      intents: ['src'],
      details: [],
    });

    expect(readBoundary(cwd, sessionB, dir)).toBeNull();
    expect(readFractalMap(cwd, sessionB)).toEqual({
      reads: [],
      intents: [],
      details: [],
    });
  });

  // Test 6: Auto-create cache dir
  it('writeBoundary: auto-creates cache directory if absent', () => {
    // Use a unique cwd so getCacheDir returns a path that doesn't exist yet
    const cwd = join(tempDir, 'nonexistent-project');
    const sessionId = 'session-006';
    const dir = '/some/dir';

    // Should not throw even though cwd subdirectory doesn't exist in cache
    expect(() => {
      writeBoundary(cwd, sessionId, dir, '/some/boundary');
    }).not.toThrow();

    expect(readBoundary(cwd, sessionId, dir)).toBe('/some/boundary');
  });

  // Test 7: readBoundary with corrupted JSON
  it('readBoundary: corrupted JSON → returns null (no throw)', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-corrupt-boundary';
    const dir = '/proj/workspace/src';

    // Write a boundary first so the cache dir exists
    writeBoundary(cwd, sessionId, dir, '/proj/workspace');
    // Overwrite with garbage
    const cacheDir = getCacheDir(cwd);
    const hash = sessionIdHash(sessionId);
    writeFileSync(`${cacheDir}/boundary-${hash}`, 'NOT-JSON!!!');

    expect(readBoundary(cwd, sessionId, dir)).toBeNull();
  });

  // Test 8: readBoundary for missing key
  it('readBoundary: valid JSON but missing key → returns null', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-missing-key';
    writeBoundary(cwd, sessionId, '/other/dir', '/boundary');

    expect(readBoundary(cwd, sessionId, '/different/dir')).toBeNull();
  });

  // Test 9: writeBoundary read-modify-write merge
  it('writeBoundary: sequential writes merge (read-modify-write)', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-merge';

    writeBoundary(cwd, sessionId, '/dir/a', '/boundary-a');
    writeBoundary(cwd, sessionId, '/dir/b', '/boundary-b');

    expect(readBoundary(cwd, sessionId, '/dir/a')).toBe('/boundary-a');
    expect(readBoundary(cwd, sessionId, '/dir/b')).toBe('/boundary-b');
  });

  // Test 10: readFractalMap with corrupted JSON
  it('readFractalMap: corrupted JSON → returns default empty map', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-corrupt-fmap';

    // Write a valid map first to create the file
    writeFractalMap(cwd, sessionId, { reads: ['x'], intents: [], details: [] });
    // Overwrite with garbage
    const cacheDir = getCacheDir(cwd);
    const hash = sessionIdHash(sessionId);
    writeFileSync(`${cacheDir}/fmap-${hash}.json`, '{BROKEN');

    const result = readFractalMap(cwd, sessionId);
    expect(result).toEqual({ reads: [], intents: [], details: [] });
  });

  // Test 11: readFractalMap with partial JSON (missing keys)
  it('readFractalMap: partial JSON (missing intents/details) → returns as-is', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-partial-fmap';

    const cacheDir = getCacheDir(cwd);
    mkdirSync(cacheDir, { recursive: true });
    const hash = sessionIdHash(sessionId);
    writeFileSync(
      `${cacheDir}/fmap-${hash}.json`,
      JSON.stringify({ reads: ['a'] }),
    );

    const result = readFractalMap(cwd, sessionId);
    expect(result.reads).toEqual(['a']);
    // Missing keys remain undefined (not defaulted)
    expect(result.intents).toBeUndefined();
  });

  // Test 12: writeFractalMap overwrite (not merge)
  it('writeFractalMap: second write overwrites completely (no merge)', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-overwrite';

    writeFractalMap(cwd, sessionId, {
      reads: ['old'],
      intents: ['old'],
      details: ['old'],
    });
    writeFractalMap(cwd, sessionId, {
      reads: ['new'],
      intents: [],
      details: [],
    });

    const result = readFractalMap(cwd, sessionId);
    expect(result).toEqual({ reads: ['new'], intents: [], details: [] });
  });

  // Test 13: writeBoundary with empty string dir key
  it('writeBoundary: empty string dir key → no crash', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-empty-dir';

    expect(() => {
      writeBoundary(cwd, sessionId, '', '/boundary');
    }).not.toThrow();

    expect(readBoundary(cwd, sessionId, '')).toBe('/boundary');
  });

  // Test 15: removeFractalMap + hasGuideInjected/markGuideInjected lifecycle
  it('removeFractalMap + hasGuideInjected/markGuideInjected lifecycle', () => {
    const cwd = '/proj/workspace';

    // Part 1: removeFractalMap deletes fmap, readFractalMap returns empty after
    const sid1 = 'session-rm-1';
    writeFractalMap(cwd, sid1, {
      reads: ['src/a'],
      intents: ['src/a'],
      details: [],
    });
    removeFractalMap(cwd, sid1);
    expect(readFractalMap(cwd, sid1)).toEqual({
      reads: [],
      intents: [],
      details: [],
    });

    // Part 2: removeFractalMap does NOT affect boundary cache
    const sid2 = 'session-rm-2';
    const dir = '/proj/workspace/src';
    writeBoundary(cwd, sid2, dir, cwd);
    writeFractalMap(cwd, sid2, { reads: ['src'], intents: [], details: [] });
    removeFractalMap(cwd, sid2);
    expect(readBoundary(cwd, sid2, dir)).toBe(cwd); // boundary survives

    // Part 3: hasGuideInjected/markGuideInjected roundtrip
    const sid3 = 'session-guide-1';
    expect(hasGuideInjected(sid3, cwd)).toBe(false);
    markGuideInjected(sid3, cwd);
    expect(hasGuideInjected(sid3, cwd)).toBe(true);
    // Different session → still false
    expect(hasGuideInjected('session-guide-other', cwd)).toBe(false);
  });

  // Test 14: Multiple boundaries stress test
  it('writeBoundary: 10+ entries in same session → all retrievable', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-stress';

    for (let i = 0; i < 15; i++) {
      writeBoundary(cwd, sessionId, `/dir/${i}`, `/boundary/${i}`);
    }

    for (let i = 0; i < 15; i++) {
      expect(readBoundary(cwd, sessionId, `/dir/${i}`)).toBe(`/boundary/${i}`);
    }
  });
});
