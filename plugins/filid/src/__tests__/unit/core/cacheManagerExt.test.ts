import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  commitVisit,
  getCacheDir,
  hasGuideInjected,
  incrementTurn,
  markGuideInjected,
  readBoundary,
  readDelivered,
  readFractalMap,
  readTurn,
  removeFractalMap,
  removeSessionFiles,
  sessionIdHash,
  writeBoundary,
} from '../../../core/infra/cacheManager/cacheManager.js';

let tempDir: string;

const record = (cwd: string, sessionId: string, readKey: string) =>
  commitVisit(
    cwd,
    { sessionId },
    {
      readKey,
      ownerKey: null,
      ttlTurns: 5,
      gateEligible: false,
    },
  );

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

  // Test 2: visit records accumulate and read back
  it('commitVisit → readFractalMap: reads accumulate in order', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-002';

    record(cwd, sessionId, 'src/payments');
    record(cwd, sessionId, 'src/auth');

    const result = readFractalMap(cwd, { sessionId });
    expect(result.reads).toEqual(['src/payments', 'src/auth']);
    expect(result.lastMap).toBe(['src/auth', 'src/payments'].join('\n'));
  });

  // Test 3: delivery + turn survive across visits (session-epoch records)
  it('delivery stamps persist per session and reset with removeSessionFiles', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-003';
    incrementTurn(cwd, sessionId);
    commitVisit(
      cwd,
      { sessionId },
      {
        readKey: 'src/checkout',
        ownerKey: 'src/checkout',
        ttlTurns: 5,
        gateEligible: false,
      },
    );

    expect(readDelivered(cwd, sessionId)).toEqual({ 'src/checkout': 1 });
    expect(readTurn(cwd, sessionId)).toBe(1);
  });

  // Test 4: removeSessionFiles cleanup (boundary, fmap, delivered, turn)
  it('removeSessionFiles: removes boundary, fmap, delivered, and turn files', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-004';
    const dir = '/proj/workspace/src';

    writeBoundary(cwd, sessionId, dir, cwd);
    incrementTurn(cwd, sessionId);
    commitVisit(
      cwd,
      { sessionId },
      {
        readKey: 'src',
        ownerKey: 'src',
        ttlTurns: 5,
        gateEligible: false,
      },
    );

    expect(readBoundary(cwd, sessionId, dir)).toBe(cwd);
    expect(readFractalMap(cwd, { sessionId }).reads).toEqual(['src']);

    removeSessionFiles(sessionId, cwd);

    expect(readBoundary(cwd, sessionId, dir)).toBeNull();
    expect(readFractalMap(cwd, { sessionId })).toEqual({ reads: [] });
    expect(readDelivered(cwd, sessionId)).toEqual({});
    expect(readTurn(cwd, sessionId)).toBe(0);
  });

  // Test 5: Session isolation — different sessionIds do not share cache
  it('session isolation: different sessionIds have independent caches', () => {
    const cwd = '/proj/workspace';
    const sessionA = 'session-A';
    const sessionB = 'session-B';
    const dir = '/proj/workspace/src';

    writeBoundary(cwd, sessionA, dir, '/proj/workspace');
    record(cwd, sessionA, 'src');

    expect(readBoundary(cwd, sessionB, dir)).toBeNull();
    expect(readFractalMap(cwd, { sessionId: sessionB })).toEqual({
      reads: [],
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

    record(cwd, sessionId, 'x');
    // Overwrite with garbage
    const cacheDir = getCacheDir(cwd);
    const hash = sessionIdHash(sessionId);
    writeFileSync(`${cacheDir}/fmap-${hash}.json`, '{BROKEN');

    expect(readFractalMap(cwd, { sessionId })).toEqual({ reads: [] });
  });

  // Test 11: readFractalMap with partial JSON (missing reads)
  it('readFractalMap: partial JSON → reads defaulted, extras preserved', () => {
    const cwd = '/proj/workspace';
    const sessionId = 'session-partial-fmap';

    const cacheDir = getCacheDir(cwd);
    mkdirSync(cacheDir, { recursive: true });
    const hash = sessionIdHash(sessionId);
    writeFileSync(
      `${cacheDir}/fmap-${hash}.json`,
      JSON.stringify({ lastMap: 'a' }),
    );

    const result = readFractalMap(cwd, { sessionId });
    expect(result.reads).toEqual([]);
    expect(result.lastMap).toBe('a');
  });

  // Test 12: turn counter lifecycle
  it('turn counter: starts at 0, increments, isolated per session', () => {
    const cwd = '/proj/workspace';
    expect(readTurn(cwd, 'session-t1')).toBe(0);
    expect(incrementTurn(cwd, 'session-t1')).toBe(1);
    expect(incrementTurn(cwd, 'session-t1')).toBe(2);
    expect(readTurn(cwd, 'session-t2')).toBe(0);
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
    record(cwd, sid1, 'src/a');
    removeFractalMap(cwd, sid1);
    expect(readFractalMap(cwd, { sessionId: sid1 })).toEqual({ reads: [] });

    // Part 2: removeFractalMap does NOT affect boundary cache
    const sid2 = 'session-rm-2';
    const dir = '/proj/workspace/src';
    writeBoundary(cwd, sid2, dir, cwd);
    record(cwd, sid2, 'src');
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

    for (let i = 0; i < 15; i++)
      writeBoundary(cwd, sessionId, `/dir/${i}`, `/boundary/${i}`);

    for (let i = 0; i < 15; i++)
      expect(readBoundary(cwd, sessionId, `/dir/${i}`)).toBe(`/boundary/${i}`);
  });
});
