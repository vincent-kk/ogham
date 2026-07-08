import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type {
  PersonalContextFile,
  PersonalState,
  PersonalTopic,
} from '../../../types/personalContext.js';
import { defaultPersonalContext } from '../normalizePersonalContext.js';
import { prunePersonalContext } from '../prunePersonalContext.js';
import {
  personalContextPath,
  readPersonalContext,
} from '../readPersonalContext.js';
import { writePersonalContext } from '../writePersonalContext.js';

const NOW = new Date('2026-07-09T00:00:00.000Z');

function makeState(overrides: Partial<PersonalState> = {}): PersonalState {
  return {
    id: 'state-1',
    label: '상태 1',
    kind: 'mood',
    intensity: 'medium',
    evidence: '근거',
    capturedAt: '2026-07-01T00:00:00.000Z',
    lastReinforcedAt: '2026-07-01T00:00:00.000Z',
    expiresAt: '2026-07-30T00:00:00.000Z',
    reinforceCount: 1,
    ...overrides,
  };
}

function makeTopic(overrides: Partial<PersonalTopic> = {}): PersonalTopic {
  return {
    id: 'topic-1',
    label: '주제 1',
    kind: 'work',
    status: 'active',
    firstSeenAt: '2026-07-01T00:00:00.000Z',
    lastSeenAt: '2026-07-08T00:00:00.000Z',
    touchCount: 1,
    ...overrides,
  };
}

describe('prunePersonalContext', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = mkdtempSync(join(tmpdir(), 'maencof-personal-context-'));
    mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
  });

  afterEach(() => rmSync(vaultDir, { recursive: true, force: true }));

  function seed(model: Partial<PersonalContextFile>): void {
    writePersonalContext(vaultDir, { ...defaultPersonalContext(), ...model });
  }

  it('파일이 없으면 no-op이고 파일을 만들지 않는다', () => {
    const result = prunePersonalContext(vaultDir, NOW);
    expect(result.changed).toBe(false);
    expect(existsSync(personalContextPath(vaultDir))).toBe(false);
  });

  it('만료된 state를 제거한다', () => {
    seed({
      states: [
        makeState({ id: 'gone', expiresAt: '2026-07-08T23:59:00.000Z' }),
        makeState({ id: 'kept', expiresAt: '2026-07-10T00:00:00.000Z' }),
      ],
    });
    const result = prunePersonalContext(vaultDir, NOW);
    expect(result.removedStates).toBe(1);
    expect(readPersonalContext(vaultDir).states.map((s) => s.id)).toEqual([
      'kept',
    ]);
  });

  it('변경이 없으면 파일을 다시 쓰지 않는다', () => {
    seed({ states: [makeState()] });
    const before = readFileSync(personalContextPath(vaultDir), 'utf-8');
    const result = prunePersonalContext(vaultDir, NOW);
    expect(result.changed).toBe(false);
    expect(readFileSync(personalContextPath(vaultDir), 'utf-8')).toBe(before);
  });

  it('config.enabled=false면 만료·경과 항목이 있어도 동결한다 (kept untouched)', () => {
    seed({
      config: { enabled: false },
      states: [makeState({ expiresAt: '2026-07-08T00:00:00.000Z' })], // 만료
      topics: [makeTopic({ due: '2026-07-01' })], // due 유예 경과
    });
    const before = readFileSync(personalContextPath(vaultDir), 'utf-8');
    const result = prunePersonalContext(vaultDir, NOW);
    expect(result.changed).toBe(false);
    expect(result.removedStates).toBe(0);
    expect(result.autoResolvedTopics).toBe(0);
    expect(readFileSync(personalContextPath(vaultDir), 'utf-8')).toBe(before);
  });

  it('due + 유예(7일) 경과한 active topic을 자동 resolved 처리한다', () => {
    seed({ topics: [makeTopic({ due: '2026-07-01' })] });
    const result = prunePersonalContext(vaultDir, NOW);
    expect(result.autoResolvedTopics).toBe(1);
    const topic = readPersonalContext(vaultDir).topics[0];
    expect(topic?.status).toBe('resolved');
    expect(topic?.lastSeenAt).toBe(NOW.toISOString());
  });

  it('due 유예 이내인 active topic은 유지한다', () => {
    seed({ topics: [makeTopic({ due: '2026-07-05' })] });
    const result = prunePersonalContext(vaultDir, NOW);
    expect(result.autoResolvedTopics).toBe(0);
    expect(readPersonalContext(vaultDir).topics[0]?.status).toBe('active');
  });

  it('resolved 후 보존 기간(14일)이 지난 topic을 제거한다', () => {
    seed({
      topics: [
        makeTopic({
          id: 'old',
          status: 'resolved',
          lastSeenAt: '2026-06-20T00:00:00.000Z',
        }),
        makeTopic({
          id: 'recent',
          status: 'resolved',
          lastSeenAt: '2026-07-01T00:00:00.000Z',
        }),
      ],
    });
    const result = prunePersonalContext(vaultDir, NOW);
    expect(result.removedTopics).toBe(1);
    expect(readPersonalContext(vaultDir).topics.map((t) => t.id)).toEqual([
      'recent',
    ]);
  });

  it('보존 캡(20) 초과 시 resolved를 우선 제거한다', () => {
    const topics = Array.from({ length: 21 }, (_, i) =>
      makeTopic({
        id: `topic-${i}`,
        status: i === 0 ? 'resolved' : 'active',
        lastSeenAt: '2026-07-08T00:00:00.000Z',
      }),
    );
    seed({ topics });
    const result = prunePersonalContext(vaultDir, NOW);
    expect(result.removedTopics).toBe(1);
    const kept = readPersonalContext(vaultDir).topics;
    expect(kept).toHaveLength(20);
    expect(kept.find((t) => t.id === 'topic-0')).toBeUndefined();
  });
});
