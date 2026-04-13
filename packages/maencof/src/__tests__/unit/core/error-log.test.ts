import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  appendErrorLog,
  appendErrorLogSafe,
  readErrorLog,
} from '../../../core/error-log/error-log.js';
import type { ErrorLogEntry } from '../../../core/error-log/error-log.js';

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'maencof-error-log-test-'));
}

function ensureMeta(cwd: string): void {
  mkdirSync(join(cwd, '.maencof-meta'), { recursive: true });
}

function makeEntry(hook = 'test-hook', error = 'test error'): ErrorLogEntry {
  return { hook, error, timestamp: '2026-01-01T00:00:00Z' };
}

describe('error-log', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
    ensureMeta(cwd);
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  // Happy path (3)
  it('returns empty array when no log file exists', () => {
    expect(readErrorLog(cwd)).toEqual([]);
  });

  it('appends and reads a single entry', () => {
    appendErrorLog(cwd, makeEntry());
    const result = readErrorLog(cwd);
    expect(result).toHaveLength(1);
    expect(result[0].hook).toBe('test-hook');
  });

  it('appendErrorLogSafe does not throw', () => {
    expect(() => {
      appendErrorLogSafe(cwd, makeEntry());
    }).not.toThrow();
    expect(readErrorLog(cwd)).toHaveLength(1);
  });

  // Edge cases
  it('evicts oldest entries when exceeding 200', () => {
    for (let i = 0; i < 201; i++) {
      appendErrorLog(cwd, makeEntry(`hook-${i}`));
    }
    const result = readErrorLog(cwd);
    expect(result).toHaveLength(200);
    expect(result[0].hook).toBe('hook-1');
  });

  it('handles corrupted JSON gracefully', () => {
    writeFileSync(join(cwd, '.maencof-meta', 'error-log.json'), 'not json');
    expect(readErrorLog(cwd)).toEqual([]);
  });

  it('creates .maencof-meta directory if missing', () => {
    const freshCwd = createTempDir();
    appendErrorLog(freshCwd, makeEntry());
    expect(readErrorLog(freshCwd)).toHaveLength(1);
    rmSync(freshCwd, { recursive: true, force: true });
  });

  it('appendErrorLogSafe never throws even with invalid path', () => {
    expect(() => {
      appendErrorLogSafe('/nonexistent/path/that/should/fail', makeEntry());
    }).not.toThrow();
  });

  it('preserves entry order', () => {
    appendErrorLog(cwd, makeEntry('a'));
    appendErrorLog(cwd, makeEntry('b'));
    appendErrorLog(cwd, makeEntry('c'));
    const result = readErrorLog(cwd);
    expect(result.map((e) => e.hook)).toEqual(['a', 'b', 'c']);
  });
});
