import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  appendTransition,
  getRejectCount,
  readTransitionHistory,
} from '../../../core/transition-history/transition-history.js';
import type { TransitionHistoryEntry } from '../../../types/agent.js';

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'maencof-transition-test-'));
}

function ensureMeta(cwd: string): void {
  mkdirSync(join(cwd, '.maencof-meta'), { recursive: true });
}

function makeEntry(overrides?: Partial<TransitionHistoryEntry>): TransitionHistoryEntry {
  return {
    directive: {
      path: '/doc.md',
      fromLayer: 3,
      toLayer: 2,
      reason: 'test',
      requestedAt: '2026-01-01T00:00:00Z',
      requestedBy: 'system',
      outcome: 'executed',
      ...overrides?.directive,
    },
    sessionId: 'test-session',
    timestamp: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('transition-history', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
    ensureMeta(cwd);
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  // Happy path (3)
  it('returns empty array when no history file exists', () => {
    expect(readTransitionHistory(cwd)).toEqual([]);
  });

  it('appends and reads a single entry', () => {
    const entry = makeEntry();
    appendTransition(cwd, entry);
    const result = readTransitionHistory(cwd);
    expect(result).toHaveLength(1);
    expect(result[0].directive.path).toBe('/doc.md');
  });

  it('appends multiple entries preserving order', () => {
    appendTransition(cwd, makeEntry({ sessionId: 's1' }));
    appendTransition(cwd, makeEntry({ sessionId: 's2' }));
    const result = readTransitionHistory(cwd);
    expect(result).toHaveLength(2);
    expect(result[0].sessionId).toBe('s1');
    expect(result[1].sessionId).toBe('s2');
  });

  // Edge cases (12)
  it('evicts oldest entries when exceeding 500', () => {
    for (let i = 0; i < 501; i++) {
      appendTransition(cwd, makeEntry({ sessionId: `s${i}` }));
    }
    const result = readTransitionHistory(cwd);
    expect(result).toHaveLength(500);
    expect(result[0].sessionId).toBe('s1');
  });

  it('getRejectCount returns 0 when no history', () => {
    expect(getRejectCount(cwd, '/doc.md', '3->2')).toBe(0);
  });

  it('getRejectCount counts only matching path and direction', () => {
    appendTransition(cwd, makeEntry({
      directive: { path: '/a.md', fromLayer: 3, toLayer: 2, reason: 'r', requestedAt: '', requestedBy: 'system', outcome: 'rejected' },
    }));
    appendTransition(cwd, makeEntry({
      directive: { path: '/a.md', fromLayer: 3, toLayer: 2, reason: 'r', requestedAt: '', requestedBy: 'system', outcome: 'executed' },
    }));
    appendTransition(cwd, makeEntry({
      directive: { path: '/b.md', fromLayer: 3, toLayer: 2, reason: 'r', requestedAt: '', requestedBy: 'system', outcome: 'rejected' },
    }));
    expect(getRejectCount(cwd, '/a.md', '3->2')).toBe(1);
  });

  it('handles corrupted JSON gracefully', () => {
    const { writeFileSync } = require('node:fs');
    writeFileSync(join(cwd, '.maencof-meta', 'transition-history.json'), 'not json');
    expect(readTransitionHistory(cwd)).toEqual([]);
  });

  it('creates .maencof-meta directory if missing', () => {
    const freshCwd = createTempDir();
    appendTransition(freshCwd, makeEntry());
    expect(readTransitionHistory(freshCwd)).toHaveLength(1);
    rmSync(freshCwd, { recursive: true, force: true });
  });
});
