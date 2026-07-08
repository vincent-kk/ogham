import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { PersonalContextFile } from '../../../types/personalContext.js';
import {
  type PersonalContextStateCaptureInput,
  applyPersonalContextMutation,
} from '../applyPersonalContextMutation.js';
import { defaultPersonalContext } from '../normalizePersonalContext.js';
import { readPersonalContext } from '../readPersonalContext.js';
import { writePersonalContext } from '../writePersonalContext.js';

const NOW = new Date('2026-07-09T00:00:00.000Z');
const DAY_MS = 86_400_000;

const stateInput: PersonalContextStateCaptureInput = {
  label: '번아웃 기미',
  kind: 'mood',
  intensity: 'medium',
  note: '야근 연속',
  evidence: "07-08 '요즘 계속 야근'",
};

function captureState(
  cwd: string,
  input: Partial<PersonalContextStateCaptureInput> = {},
  now: Date = NOW,
) {
  return applyPersonalContextMutation(
    cwd,
    { target: 'state', action: 'capture', state: { ...stateInput, ...input } },
    now,
  );
}

function captureTopic(cwd: string, label: string, now: Date = NOW) {
  return applyPersonalContextMutation(
    cwd,
    { target: 'topic', action: 'capture', topic: { label, kind: 'work' } },
    now,
  );
}

describe('applyPersonalContextMutation', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = mkdtempSync(join(tmpdir(), 'maencof-personal-context-'));
    mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
  });

  afterEach(() => rmSync(vaultDir, { recursive: true, force: true }));

  it('신규 state 캡처가 파일을 생성하고 필드를 채운다', () => {
    const result = captureState(vaultDir);
    expect(result.success).toBe(true);
    expect(result.merged).toBe(false);
    expect(result.id).toBe('번아웃-기미');

    const state = readPersonalContext(vaultDir).states[0];
    expect(state?.reinforceCount).toBe(1);
    expect(state?.expiresAt).toBe(
      new Date(NOW.getTime() + 14 * DAY_MS).toISOString(),
    );
  });

  it('ttlDays 지정 시 expiresAt에 반영된다', () => {
    captureState(vaultDir, { ttlDays: 30 });
    expect(readPersonalContext(vaultDir).states[0]?.expiresAt).toBe(
      new Date(NOW.getTime() + 30 * DAY_MS).toISOString(),
    );
  });

  it('같은 label 재캡처는 재강화로 병합된다 (한글 슬러그 dedup)', () => {
    captureState(vaultDir);
    const later = new Date(NOW.getTime() + DAY_MS);
    const result = captureState(vaultDir, { intensity: 'high' }, later);

    expect(result.merged).toBe(true);
    const states = readPersonalContext(vaultDir).states;
    expect(states).toHaveLength(1);
    expect(states[0]?.reinforceCount).toBe(2);
    expect(states[0]?.intensity).toBe('high');
    expect(states[0]?.expiresAt).toBe(
      new Date(later.getTime() + 14 * DAY_MS).toISOString(),
    );
    expect(states[0]?.capturedAt).toBe(NOW.toISOString());
  });

  it('active 캡(10) 도달 시 신규 캡처를 거부하고 현황을 반환한다', () => {
    for (let i = 0; i < 10; i += 1)
      captureState(vaultDir, { label: `상태 ${i}` });
    const result = captureState(vaultDir, { label: '새 상태' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('cap (10) reached');
    expect(result.message).toContain('상태 0');
    expect(readPersonalContext(vaultDir).states).toHaveLength(10);
  });

  it('만료된 state는 캡 판정에서 제외되고 쓰는 김에 정리된다', () => {
    for (let i = 0; i < 10; i += 1)
      captureState(vaultDir, { label: `상태 ${i}`, ttlDays: 1 });
    const later = new Date(NOW.getTime() + 3 * DAY_MS);
    const result = captureState(vaultDir, { label: '새 상태' }, later);

    expect(result.success).toBe(true);
    const states = readPersonalContext(vaultDir).states;
    expect(states).toHaveLength(1);
    expect(states[0]?.label).toBe('새 상태');
  });

  it('resolve는 state를 즉시 제거한다', () => {
    captureState(vaultDir);
    const result = applyPersonalContextMutation(
      vaultDir,
      { target: 'state', action: 'resolve', label: '번아웃 기미' },
      NOW,
    );
    expect(result.success).toBe(true);
    expect(readPersonalContext(vaultDir).states).toHaveLength(0);
  });

  it('존재하지 않는 항목 resolve는 실패를 반환한다', () => {
    const result = applyPersonalContextMutation(
      vaultDir,
      { target: 'topic', action: 'resolve', label: '없는 주제' },
      NOW,
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain('No topic matching');
  });

  it('config.enabled=false면 캡처를 거부한다', () => {
    const disabled: PersonalContextFile = {
      ...defaultPersonalContext(),
      config: { enabled: false },
    };
    writePersonalContext(vaultDir, disabled);
    const result = captureState(vaultDir);
    expect(result.success).toBe(false);
    expect(result.message).toContain('disabled');
  });

  it('신규 topic 캡처는 active/touchCount 1로 시작한다', () => {
    const result = captureTopic(vaultDir, '이직 타이밍 고민');
    expect(result.success).toBe(true);
    const topic = readPersonalContext(vaultDir).topics[0];
    expect(topic?.status).toBe('active');
    expect(topic?.touchCount).toBe(1);
    expect(topic?.firstSeenAt).toBe(NOW.toISOString());
  });

  it('같은 topic 재캡처는 touch로 병합되고 resolved를 재활성화한다', () => {
    captureTopic(vaultDir, '이직 타이밍 고민');
    applyPersonalContextMutation(
      vaultDir,
      { target: 'topic', action: 'resolve', label: '이직 타이밍 고민' },
      NOW,
    );
    const later = new Date(NOW.getTime() + DAY_MS);
    const result = captureTopic(vaultDir, '이직 타이밍 고민', later);

    expect(result.merged).toBe(true);
    const topics = readPersonalContext(vaultDir).topics;
    expect(topics).toHaveLength(1);
    expect(topics[0]?.status).toBe('active');
    expect(topics[0]?.touchCount).toBe(2);
    expect(topics[0]?.lastSeenAt).toBe(later.toISOString());
  });

  it('topic 보존 캡(20) 초과 시 resolved 우선으로 즉시 evict한다', () => {
    for (let i = 0; i < 20; i += 1) captureTopic(vaultDir, `주제 ${i}`);
    applyPersonalContextMutation(
      vaultDir,
      { target: 'topic', action: 'resolve', label: '주제 0' },
      NOW,
    );
    captureTopic(vaultDir, '새 주제');

    const topics = readPersonalContext(vaultDir).topics;
    expect(topics).toHaveLength(20);
    expect(topics.find((t) => t.label === '주제 0')).toBeUndefined();
    expect(topics.find((t) => t.label === '새 주제')).toBeDefined();
  });

  it('label이 빈 슬러그로 정규화되면 캡처를 거부한다', () => {
    const result = captureState(vaultDir, { label: '!!!' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('empty id');
  });
});
