import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  readBoundary,
  readFractalMap,
  removeSessionFiles,
  writeBoundary,
  writeFractalMap,
} from '../../../core/cache-manager.js';

let tempDir: string;

beforeEach(() => {
  tempDir = join(tmpdir(), `filid-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
    writeFractalMap(cwd, sessionId, { reads: ['src'], intents: [], details: [] });

    // Verify files were written
    expect(readBoundary(cwd, sessionId, dir)).toBe(cwd);
    expect(readFractalMap(cwd, sessionId).reads).toEqual(['src']);

    removeSessionFiles(sessionId, cwd);

    // After cleanup, reads should return defaults
    expect(readBoundary(cwd, sessionId, dir)).toBeNull();
    expect(readFractalMap(cwd, sessionId)).toEqual({ reads: [], intents: [], details: [] });
  });

  // Test 5: Session isolation — different sessionIds do not share cache
  it('session isolation: different sessionIds have independent caches', () => {
    const cwd = '/proj/workspace';
    const sessionA = 'session-A';
    const sessionB = 'session-B';
    const dir = '/proj/workspace/src';

    writeBoundary(cwd, sessionA, dir, '/proj/workspace');
    writeFractalMap(cwd, sessionA, { reads: ['src'], intents: ['src'], details: [] });

    expect(readBoundary(cwd, sessionB, dir)).toBeNull();
    expect(readFractalMap(cwd, sessionB)).toEqual({ reads: [], intents: [], details: [] });
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
});
