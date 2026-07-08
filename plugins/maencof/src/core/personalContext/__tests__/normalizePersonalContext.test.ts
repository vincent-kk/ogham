import { describe, expect, it } from 'vitest';

import type { PersonalContextFile } from '../../../types/personalContext.js';
import {
  defaultPersonalContext,
  normalizePersonalContext,
} from '../normalizePersonalContext.js';

const validState = {
  id: '번아웃-기미',
  label: '번아웃 기미',
  kind: 'mood',
  intensity: 'medium',
  note: '야근 연속',
  evidence: "07-08 '요즘 계속 야근'",
  capturedAt: '2026-07-08T14:00:00.000Z',
  lastReinforcedAt: '2026-07-08T14:00:00.000Z',
  expiresAt: '2026-07-22T14:00:00.000Z',
  reinforceCount: 2,
};

const validTopic = {
  id: '이직-타이밍-고민',
  label: '이직 타이밍 고민',
  kind: 'concern',
  note: '연내 결정 희망',
  status: 'active',
  due: '2026-07-20',
  firstSeenAt: '2026-07-01T00:00:00.000Z',
  lastSeenAt: '2026-07-08T00:00:00.000Z',
  touchCount: 3,
};

function envelope(overrides: Record<string, unknown> = {}): unknown {
  return {
    _schemaVersion: 1,
    config: { enabled: true },
    states: [validState],
    topics: [validTopic],
    ...overrides,
  };
}

describe('normalizePersonalContext', () => {
  it('정상 envelope을 손실 없이 통과시킨다', () => {
    const model = normalizePersonalContext(envelope());
    expect(model.states).toHaveLength(1);
    expect(model.topics).toHaveLength(1);
    expect(model.states[0]).toEqual(validState);
    expect(model.topics[0]).toEqual(validTopic);
  });

  it('객체가 아니면 default envelope을 반환한다', () => {
    expect(normalizePersonalContext(null)).toEqual(defaultPersonalContext());
    expect(normalizePersonalContext('broken')).toEqual(
      defaultPersonalContext(),
    );
  });

  it('빈 객체는 enabled=true 기본 구조로 정규화된다', () => {
    const model = normalizePersonalContext({});
    expect(model.config.enabled).toBe(true);
    expect(model.states).toEqual([]);
    expect(model.topics).toEqual([]);
  });

  it('intensity가 enum 밖인 state는 drop된다', () => {
    const model = normalizePersonalContext(
      envelope({ states: [{ ...validState, intensity: 'extreme' }] }),
    );
    expect(model.states).toEqual([]);
  });

  it('필수 문자열 필드가 빈 state는 drop된다', () => {
    const model = normalizePersonalContext(
      envelope({ states: [{ ...validState, expiresAt: '' }] }),
    );
    expect(model.states).toEqual([]);
  });

  it('reinforceCount 결측은 1로 채운다', () => {
    const { reinforceCount: _omitted, ...withoutCount } = validState;
    const model = normalizePersonalContext(
      envelope({ states: [withoutCount] }),
    );
    expect(model.states[0]?.reinforceCount).toBe(1);
  });

  it('note가 없는 state는 note 필드 자체를 갖지 않는다', () => {
    const { note: _omitted, ...withoutNote } = validState;
    const model = normalizePersonalContext(envelope({ states: [withoutNote] }));
    expect(model.states[0]).not.toHaveProperty('note');
  });

  it('status가 enum 밖인 topic은 drop된다', () => {
    const model = normalizePersonalContext(
      envelope({ topics: [{ ...validTopic, status: 'stale' }] }),
    );
    expect(model.topics).toEqual([]);
  });

  it('touchCount 결측은 1로, due 결측은 필드 부재로 정규화된다', () => {
    const { touchCount: _count, due: _due, ...bare } = validTopic;
    const model = normalizePersonalContext(envelope({ topics: [bare] }));
    expect(model.topics[0]?.touchCount).toBe(1);
    expect(model.topics[0]).not.toHaveProperty('due');
  });

  it('명시적 비활성 표기(false/"false"/0)는 disabled, 그 외 비불리언은 true', () => {
    const enabledOf = (enabled: unknown): boolean =>
      normalizePersonalContext(envelope({ config: { enabled } })).config
        .enabled;
    expect(enabledOf(false)).toBe(false);
    expect(enabledOf('false')).toBe(false);
    expect(enabledOf(0)).toBe(false);
    expect(enabledOf('off')).toBe(true);
    expect(enabledOf(true)).toBe(true);
  });

  it('reinforceCount/touchCount의 음수·소수·0은 1로 정규화한다', () => {
    const reinforce = (value: unknown): number | undefined =>
      normalizePersonalContext(
        envelope({ states: [{ ...validState, reinforceCount: value }] }),
      ).states[0]?.reinforceCount;
    expect(reinforce(-5)).toBe(1);
    expect(reinforce(2.7)).toBe(1);
    expect(reinforce(0)).toBe(1);
    expect(reinforce(3)).toBe(3);

    const touch = (value: unknown): number | undefined =>
      normalizePersonalContext(
        envelope({ topics: [{ ...validTopic, touchCount: value }] }),
      ).topics[0]?.touchCount;
    expect(touch(-1)).toBe(1);
    expect(touch(4)).toBe(4);
  });

  it('_schemaVersion이 수치가 아니면 현재 버전으로 채운다', () => {
    const model: PersonalContextFile = normalizePersonalContext(
      envelope({ _schemaVersion: 'v1' }),
    );
    expect(model._schemaVersion).toBe(1);
  });
});
