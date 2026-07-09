import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { defaultPersonalContext } from '../../../../core/personalContext/defaultPersonalContext.js';
import { readPersonalContext } from '../../../../core/personalContext/readPersonalContext.js';
import { writePersonalContext } from '../../../../core/personalContext/writePersonalContext.js';
import {
  type PersonalContextCaptureArgs,
  handlePersonalContextCapture,
  personalContextCaptureInputSchema,
} from '../personalContextCapture.js';

const stateArgs: PersonalContextCaptureArgs = {
  target: 'state',
  label: '번아웃 기미',
  kind: 'mood',
  intensity: 'medium',
  evidence: "07-08 '요즘 계속 야근'",
};

const topicArgs: PersonalContextCaptureArgs = {
  target: 'topic',
  label: '이직 타이밍 고민',
  kind: 'concern',
};

describe('personalContextCaptureInputSchema', () => {
  it('정상 state/topic 입력을 통과시킨다', () => {
    expect(personalContextCaptureInputSchema.safeParse(stateArgs).success).toBe(true);
    expect(
      personalContextCaptureInputSchema.safeParse({
        ...topicArgs,
        due: '2026-07-20',
      }).success,
    ).toBe(true);
  });

  it('label 길이 상한(40)을 넘기면 거부한다', () => {
    const result = personalContextCaptureInputSchema.safeParse({
      ...stateArgs,
      label: '가'.repeat(41),
    });
    expect(result.success).toBe(false);
  });

  it('kind는 소문자 kebab 패턴만 허용한다', () => {
    for (const kind of ['Mood', 'physical health', '기분', '-lead'])
      expect(
        personalContextCaptureInputSchema.safeParse({ ...stateArgs, kind }).success,
      ).toBe(false);
    expect(
      personalContextCaptureInputSchema.safeParse({
        ...stateArgs,
        kind: 'physical-health',
      }).success,
    ).toBe(true);
  });

  it('due는 YYYY-MM-DD만, ttlDays는 1–60만 허용한다', () => {
    expect(
      personalContextCaptureInputSchema.safeParse({ ...topicArgs, due: '07-20' })
        .success,
    ).toBe(false);
    expect(
      personalContextCaptureInputSchema.safeParse({ ...stateArgs, ttlDays: 0 })
        .success,
    ).toBe(false);
    expect(
      personalContextCaptureInputSchema.safeParse({ ...stateArgs, ttlDays: 61 })
        .success,
    ).toBe(false);
  });
});

describe('handlePersonalContextCapture', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = mkdtempSync(join(tmpdir(), 'maencof-um-tool-'));
    mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
  });

  afterEach(() => rmSync(vaultDir, { recursive: true, force: true }));

  it('capture에 kind가 없으면 거부한다', async () => {
    const { kind: _omitted, ...withoutKind } = stateArgs;
    const result = await handlePersonalContextCapture(vaultDir, withoutKind);
    expect(result.success).toBe(false);
    expect(result.message).toContain('kind is required');
  });

  it('state capture에 intensity/evidence가 없으면 거부한다', async () => {
    const { intensity: _i, ...noIntensity } = stateArgs;
    expect(
      (await handlePersonalContextCapture(vaultDir, noIntensity)).message,
    ).toContain('intensity');
    const { evidence: _e, ...noEvidence } = stateArgs;
    expect(
      (await handlePersonalContextCapture(vaultDir, noEvidence)).message,
    ).toContain('evidence');
  });

  it('state capture에 due를 주면 거부한다', async () => {
    const result = await handlePersonalContextCapture(vaultDir, {
      ...stateArgs,
      due: '2026-07-20',
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('topic captures only');
  });

  it('state note가 80자를 넘으면 거부한다', async () => {
    const result = await handlePersonalContextCapture(vaultDir, {
      ...stateArgs,
      note: '가'.repeat(81),
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('80');
  });

  it('topic capture에 state 전용 필드를 주면 거부한다', async () => {
    const result = await handlePersonalContextCapture(vaultDir, {
      ...topicArgs,
      intensity: 'low',
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('state captures only');
  });

  it('정상 state capture는 파일에 기록된다', async () => {
    const result = await handlePersonalContextCapture(vaultDir, {
      ...stateArgs,
      note: '야근 연속',
      ttlDays: 21,
    });
    expect(result.success).toBe(true);
    const state = readPersonalContext(vaultDir).states[0];
    expect(state?.id).toBe('번아웃-기미');
    expect(state?.note).toBe('야근 연속');
  });

  it('정상 topic capture와 resolve가 왕복 동작한다', async () => {
    await handlePersonalContextCapture(vaultDir, { ...topicArgs, due: '2026-07-20' });
    expect(readPersonalContext(vaultDir).topics[0]?.due).toBe('2026-07-20');

    const resolved = await handlePersonalContextCapture(vaultDir, {
      target: 'topic',
      action: 'resolve',
      label: '이직 타이밍 고민',
    });
    expect(resolved.success).toBe(true);
    expect(readPersonalContext(vaultDir).topics[0]?.status).toBe('resolved');
  });

  it('disabled면 mutation을 거부한다', async () => {
    writePersonalContext(vaultDir, {
      ...defaultPersonalContext(),
      config: { enabled: false },
    });
    const result = await handlePersonalContextCapture(vaultDir, stateArgs);
    expect(result.success).toBe(false);
    expect(result.message).toContain('disabled');
  });
});
