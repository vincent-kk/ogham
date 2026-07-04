/**
 * @file companionIdentityTag.test.ts
 * @description buildCompanionIdentityTag + readCompanionIdentity 유닛 테스트
 *
 * 회귀 가드: setup 위저드가 personality를 서술형 string으로 저장한 vault에서
 * <personality></personality> 빈 태그가 주입되던 버그 (2026-07-04).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildCompanionIdentityTag } from '../../core/turnContext/buildCompanionIdentityTag.js';
import { readCompanionIdentity } from '../../core/turnContext/readCompanionIdentity.js';
import type { CompanionIdentityMinimal } from '../../types/companionGuard.js';

function identity(
  overrides?: Partial<CompanionIdentityMinimal>,
): CompanionIdentityMinimal {
  return { name: 'Cael', greeting: '안녕하세요', ...overrides };
}

describe('buildCompanionIdentityTag', () => {
  it('객체 personality를 tone/approach 속성 + traits 본문으로 직렬화한다', () => {
    const tag = buildCompanionIdentityTag(
      identity({
        role: '사고 동료',
        personality: {
          tone: '차분한',
          approach: '체계적',
          traits: ['간결', '정확'],
        },
      }),
    );
    expect(tag).toContain('You are Cael, a 사고 동료.');
    expect(tag).toContain(
      '<personality tone="차분한" approach="체계적">간결,정확</personality>',
    );
  });

  it('서술형 string personality를 본문 그대로 싣는다', () => {
    const text = '군더더기 없는 말투, 결정적일 때 정곡을 찌른다.';
    const tag = buildCompanionIdentityTag(identity({ personality: text }));
    expect(tag).toContain(`<personality>${text}</personality>`);
    expect(tag).not.toContain('<personality></personality>');
  });

  it('공백뿐인 string personality는 태그를 생략한다', () => {
    const tag = buildCompanionIdentityTag(identity({ personality: '  \n ' }));
    expect(tag).not.toContain('<personality');
  });

  it('빈 객체 personality는 빈 태그 대신 태그를 생략한다', () => {
    const tag = buildCompanionIdentityTag(identity({ personality: {} }));
    expect(tag).not.toContain('<personality');
  });

  it('traits만 있는 객체는 속성 없이 본문만 싣는다', () => {
    const tag = buildCompanionIdentityTag(
      identity({ personality: { traits: ['간결'] } }),
    );
    expect(tag).toContain('<personality>간결</personality>');
  });

  it('personality 부재 시 태그를 생략한다', () => {
    const tag = buildCompanionIdentityTag(identity());
    expect(tag).not.toContain('<personality');
  });

  it('role 부재 시 단순 선언을 사용한다', () => {
    const tag = buildCompanionIdentityTag(identity());
    expect(tag).toContain('You are Cael.');
  });

  it('principles와 taboos를 " | "로 연결한다', () => {
    const tag = buildCompanionIdentityTag(
      identity({ principles: ['a', 'b'], taboos: ['c'] }),
    );
    expect(tag).toContain('<principles>a | b</principles>');
    expect(tag).toContain('<taboos>c</taboos>');
  });
});

describe('readCompanionIdentity', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = mkdtempSync(join(tmpdir(), 'maencof-companion-'));
    mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true });
  });

  function writeIdentityFile(data: unknown): void {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'companion-identity.json'),
      typeof data === 'string' ? data : JSON.stringify(data),
      'utf-8',
    );
  }

  it('string personality 파일을 유효 identity로 반환한다 (실사용 vault 형태)', () => {
    writeIdentityFile({
      name: 'Cael',
      greeting: '오늘 흐름 하나부터 풀어볼까요?',
      personality: '서술형 성격 텍스트',
      created: '2026-05-06',
    });
    const result = readCompanionIdentity(vaultDir);
    expect(result?.personality).toBe('서술형 성격 텍스트');
    expect(
      buildCompanionIdentityTag(result as CompanionIdentityMinimal),
    ).toContain('<personality>서술형 성격 텍스트</personality>');
  });

  it('파일이 없으면 null을 반환한다', () => {
    expect(readCompanionIdentity(vaultDir)).toBeNull();
  });

  it('깨진 JSON이면 null을 반환한다', () => {
    writeIdentityFile('{not json');
    expect(readCompanionIdentity(vaultDir)).toBeNull();
  });

  it('name/greeting 누락 시 null을 반환한다', () => {
    writeIdentityFile({ personality: '텍스트만 있음' });
    expect(readCompanionIdentity(vaultDir)).toBeNull();
  });
});
