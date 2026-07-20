import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  commitVisit,
  getCacheDir,
  hasGuideInjected,
  incrementTurn,
  readDelivered,
  readFractalMap,
  removeFractalMap,
} from '../../../core/infra/cacheManager/cacheManager.js';
import type { VisitScope } from '../../../core/infra/cacheManager/cacheManager.js';

// commitVisit — the visit transaction: delivery 3-state, read merge, lastMap
// compare-and-set, guide once. Sequential calls emulate concurrent hook
// processes (each call re-reads on-disk state under the lock).

let tempDir: string;
const CWD = '/proj/workspace';

const scopeOf = (sessionId: string, sub?: string): VisitScope =>
  sub ? { sessionId, sub } : { sessionId };

const visit = (
  scope: VisitScope,
  readKey: string,
  ownerKey: string | null,
  overrides: Partial<{
    ttlTurns: number;
    gateEligible: boolean;
    silentDelivery: boolean;
  }> = {},
) =>
  commitVisit(CWD, scope, {
    readKey,
    ownerKey,
    ttlTurns: 5,
    gateEligible: false,
    ...overrides,
  });

beforeEach(() => {
  tempDir = join(
    tmpdir(),
    `filid-commit-visit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(tempDir, { recursive: true });
  process.env.CLAUDE_CONFIG_DIR = tempDir;
});

afterEach(() => {
  delete process.env.CLAUDE_CONFIG_DIR;
  rmSync(tempDir, { recursive: true, force: true });
});

describe('commitVisit — delivery state', () => {
  it('first delivery: none → stamped → fresh on the next visit', () => {
    const scope = scopeOf('s-delivery');
    const first = visit(scope, '/b\tsrc/a', '/b\tsrc/a');
    expect(first.deliveredState).toBe('none');
    expect(readDelivered(CWD, 's-delivery')).toHaveProperty(['/b\tsrc/a']);

    const second = visit(scope, '/b\tsrc/a', '/b\tsrc/a');
    expect(second.deliveredState).toBe('fresh');
  });

  it('TTL: fresh strictly under ttlTurns, stale at ttlTurns elapsed', () => {
    const sessionId = 's-ttl';
    const scope = scopeOf(sessionId);
    incrementTurn(CWD, sessionId); // turn 1
    visit(scope, '/b\tm', '/b\tm'); // stamped at turn 1

    for (let i = 0; i < 4; i++) incrementTurn(CWD, sessionId); // turn 5 → elapsed 4
    expect(visit(scope, '/b\tother', '/b\tm').deliveredState).toBe('fresh');

    incrementTurn(CWD, sessionId); // turn 6 → elapsed 5 = ttl
    const stale = visit(scope, '/b\tanother', '/b\tm');
    expect(stale.deliveredState).toBe('stale');

    // stale re-delivery re-stamps: immediately fresh again
    expect(visit(scope, '/b\tmore', '/b\tm').deliveredState).toBe('fresh');
  });

  it('ownerKey null → fresh (nothing to deliver), read still recorded', () => {
    const scope = scopeOf('s-noowner');
    const decision = visit(scope, '/b\tsrc', null);
    expect(decision.deliveredState).toBe('fresh');
    expect(decision.reads).toContain('/b\tsrc');
  });

  it('gate deny path: delivery stamped, read NOT recorded, lastMap frozen', () => {
    const scope = scopeOf('s-gate');
    const deny = visit(scope, '/b\tmod', '/b\tmod', { gateEligible: true });
    expect(deny.deliveredState).toBe('none');
    expect(deny.mapChanged).toBe(false);
    expect(readFractalMap(CWD, scope).reads).toEqual([]);
    expect(readDelivered(CWD, 's-gate')).toHaveProperty(['/b\tmod']);

    // retry: delivered → fresh, gate does not fire, read recorded now
    const retry = visit(scope, '/b\tmod', '/b\tmod', { gateEligible: true });
    expect(retry.deliveredState).toBe('fresh');
    expect(retry.reads).toContain('/b\tmod');
  });

  it('silentDelivery stamps without consuming the guide', () => {
    const scope = scopeOf('s-silent');
    const decision = visit(scope, '/b\tmod', '/b\tmod', {
      silentDelivery: true,
    });
    expect(decision.deliveredState).toBe('none');
    expect(decision.guideNeeded).toBe(false);
    expect(hasGuideInjected('s-silent', CWD)).toBe(false);
    expect(readDelivered(CWD, 's-silent')).toHaveProperty(['/b\tmod']);
  });
});

describe('commitVisit — guide, map CAS, merge', () => {
  it('guideNeeded exactly once per session scope', () => {
    const scope = scopeOf('s-guide');
    expect(visit(scope, '/b\ta', '/b\ta').guideNeeded).toBe(true);
    expect(visit(scope, '/b\tb', '/b\tb').guideNeeded).toBe(false);
    expect(hasGuideInjected('s-guide', CWD)).toBe(true);
  });

  it('mapChanged: true when the visit set grows, false when unchanged', () => {
    const scope = scopeOf('s-map');
    expect(visit(scope, '/b\ta', null).mapChanged).toBe(true);
    expect(visit(scope, '/b\ta', null).mapChanged).toBe(false);
    expect(visit(scope, '/b\tb', null).mapChanged).toBe(true);
  });

  it('lost-update regression: sequential commits from concurrent processes both survive', () => {
    const scope = scopeOf('s-race');
    visit(scope, '/b\tsrc/core', null);
    const merged = visit(scope, '/b\tsrc/ast', null);
    expect(merged.reads).toEqual(['/b\tsrc/core', '/b\tsrc/ast']);
  });

  it('leaves no tmp residue after a commit', () => {
    visit(scopeOf('s-tmp'), '/b\tsrc', null);
    const leftover = readdirSync(getCacheDir(CWD)).filter((f) =>
      f.endsWith('.tmp'),
    );
    expect(leftover).toEqual([]);
  });

  it('removeFractalMap resets reads and lastMap (per-turn reset)', () => {
    const scope = scopeOf('s-reset');
    visit(scope, '/b\tstale', null);
    removeFractalMap(CWD, 's-reset');
    const after = visit(scope, '/b\tfresh', null);
    expect(after.reads).toEqual(['/b\tfresh']);
    expect(after.mapChanged).toBe(true);
  });
});

describe('commitVisit — subagent scope', () => {
  it('sub scope: delivery/guide ride in its own fmap, main scope untouched', () => {
    const sessionId = 's-sub';
    const sub = scopeOf(sessionId, 'agent-aprobe-123');

    const first = visit(sub, '/b\tmod', '/b\tmod');
    expect(first.deliveredState).toBe('none');
    expect(first.guideNeeded).toBe(true);

    const second = visit(sub, '/b\tmod2', '/b\tmod');
    expect(second.deliveredState).toBe('fresh');
    expect(second.guideNeeded).toBe(false);

    // main-session records stay clean
    expect(readDelivered(CWD, sessionId)).toEqual({});
    expect(hasGuideInjected(sessionId, CWD)).toBe(false);
    expect(readFractalMap(CWD, scopeOf(sessionId)).reads).toEqual([]);

    // per-turn sweep removes the sub-scope file too
    removeFractalMap(CWD, sessionId);
    expect(readFractalMap(CWD, sub).reads).toEqual([]);
  });
});
