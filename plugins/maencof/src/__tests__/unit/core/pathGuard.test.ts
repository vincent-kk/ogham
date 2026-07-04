/**
 * @file pathGuard.test.ts
 * @description resolveWithinVault 경로 봉쇄 유닛 테스트
 */
import { resolve, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveWithinVault } from '../../../core/pathGuard/pathGuard.js';

const ROOT = resolve('/tmp/maencof-vault');

describe('resolveWithinVault', () => {
  it('vault 내부 상대 경로를 절대경로로 해석한다', () => {
    const result = resolveWithinVault(ROOT, '02_Derived/note.md');
    expect(result).toEqual({
      absolutePath: `${ROOT}${sep}02_Derived${sep}note.md`,
    });
  });

  it('".."를 포함해도 vault 내부에 머무는 경로는 허용한다', () => {
    const result = resolveWithinVault(ROOT, 'a/b/../c.md');
    expect(result).toEqual({ absolutePath: `${ROOT}${sep}a${sep}c.md` });
  });

  it('상위 디렉토리 traversal을 거부한다', () => {
    expect('error' in resolveWithinVault(ROOT, '../secret.md')).toBe(true);
  });

  it('깊은 traversal(../../etc/passwd)을 거부한다', () => {
    expect('error' in resolveWithinVault(ROOT, '../../etc/passwd')).toBe(true);
  });

  it('중간 경유 후 탈출하는 경로(a/../../b)를 거부한다', () => {
    expect('error' in resolveWithinVault(ROOT, 'a/../../b')).toBe(true);
  });

  it('절대 경로 입력을 거부한다', () => {
    expect('error' in resolveWithinVault(ROOT, '/etc/passwd')).toBe(true);
  });

  it('빈 경로와 루트 자신(".")을 거부한다', () => {
    expect('error' in resolveWithinVault(ROOT, '')).toBe(true);
    expect('error' in resolveWithinVault(ROOT, '.')).toBe(true);
  });

  it('거부 메시지에 입력 경로를 포함한다', () => {
    const result = resolveWithinVault(ROOT, '../x');
    expect('error' in result && result.error).toContain('../x');
  });
});
