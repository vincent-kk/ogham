/**
 * @file dailynote-writer.test.ts
 * @description dailynote-writer 순수 함수 단위 테스트
 */
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  appendDailynoteEntry,
  buildToolDescription,
  formatDate,
  formatDailynoteEntry,
  formatTime,
  getDailynoteDir,
  getDailynotePath,
  parseDailynote,
} from '../../../core/dailynote-writer.js';
import type { DailynoteEntry } from '../../../types/dailynote.js';

function createTempVault(): string {
  const dir = join(tmpdir(), `maencof-dn-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  return dir;
}

describe('getDailynoteDir', () => {
  it('.maencof-meta/dailynotes/ 경로를 반환한다', () => {
    const dir = getDailynoteDir('/test/vault');
    expect(dir).toBe(join('/test/vault', '.maencof-meta', 'dailynotes'));
  });
});

describe('getDailynotePath', () => {
  it('날짜 지정 시 해당 날짜 파일 경로를 반환한다', () => {
    const path = getDailynotePath('/test/vault', '2026-03-02');
    expect(path).toBe(
      join('/test/vault', '.maencof-meta', 'dailynotes', '2026-03-02.md'),
    );
  });

  it('날짜 미지정 시 오늘 날짜를 사용한다', () => {
    const path = getDailynotePath('/test/vault');
    const today = formatDate(new Date());
    expect(path).toContain(today);
  });
});

describe('formatDailynoteEntry', () => {
  it('path 없는 엔트리를 올바르게 포맷한다', () => {
    const entry: DailynoteEntry = {
      time: '09:15',
      category: 'session',
      description: '세션 시작',
    };
    const result = formatDailynoteEntry(entry);
    expect(result).toBe('- **[09:15]** `session` 세션 시작');
  });

  it('path 있는 엔트리를 올바르게 포맷한다', () => {
    const entry: DailynoteEntry = {
      time: '09:16',
      category: 'document',
      description: '문서 생성 (L2, tags: ts)',
      path: '02_Derived/test.md',
    };
    const result = formatDailynoteEntry(entry);
    expect(result).toBe(
      '- **[09:16]** `document` 문서 생성 (L2, tags: ts) → 02_Derived/test.md',
    );
  });
});

describe('parseDailynote', () => {
  it('마크다운 dailynote를 파싱한다', () => {
    const content = [
      '# Dailynote — 2026-03-02',
      '',
      '## Activity Log',
      '',
      '- **[09:15]** `session` 세션 시작',
      '- **[09:16]** `document` 문서 생성 (L2) → 02_Derived/test.md',
      '- **[10:30]** `config` CLAUDE.md 지시문 병합',
    ].join('\n');

    const entries = parseDailynote(content);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({
      time: '09:15',
      category: 'session',
      description: '세션 시작',
    });
    expect(entries[1]).toEqual({
      time: '09:16',
      category: 'document',
      description: '문서 생성 (L2)',
      path: '02_Derived/test.md',
    });
    expect(entries[2]).toEqual({
      time: '10:30',
      category: 'config',
      description: 'CLAUDE.md 지시문 병합',
    });
  });

  it('빈 내용은 빈 배열을 반환한다', () => {
    expect(parseDailynote('')).toEqual([]);
  });

  it('헤더만 있는 경우 빈 배열을 반환한다', () => {
    const content = '# Dailynote — 2026-03-02\n\n## Activity Log\n';
    expect(parseDailynote(content)).toEqual([]);
  });
});

describe('appendDailynoteEntry', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('파일이 없으면 헤더와 함께 새로 생성한다', () => {
    appendDailynoteEntry(vaultDir, {
      time: '09:15',
      category: 'session',
      description: '세션 시작',
    });

    const today = formatDate(new Date());
    const filePath = getDailynotePath(vaultDir, today);
    expect(existsSync(filePath)).toBe(true);

    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain(`# Dailynote — ${today}`);
    expect(content).toContain('## Activity Log');
    expect(content).toContain('- **[09:15]** `session` 세션 시작');
  });

  it('파일이 있으면 엔트리를 append한다', () => {
    // 첫 번째 엔트리
    appendDailynoteEntry(vaultDir, {
      time: '09:15',
      category: 'session',
      description: '첫 번째',
    });
    // 두 번째 엔트리
    appendDailynoteEntry(vaultDir, {
      time: '09:20',
      category: 'document',
      description: '두 번째',
      path: '02_Derived/test.md',
    });

    const today = formatDate(new Date());
    const content = readFileSync(getDailynotePath(vaultDir, today), 'utf-8');
    const entries = parseDailynote(content);
    expect(entries).toHaveLength(2);
    expect(entries[0].description).toBe('첫 번째');
    expect(entries[1].description).toBe('두 번째');
  });

  it('dailynotes 디렉토리가 없으면 자동 생성한다', () => {
    const dnDir = getDailynoteDir(vaultDir);
    expect(existsSync(dnDir)).toBe(false);

    appendDailynoteEntry(vaultDir, {
      time: '09:15',
      category: 'session',
      description: '테스트',
    });

    expect(existsSync(dnDir)).toBe(true);
  });
});

describe('buildToolDescription', () => {
  it('maencof_create를 설명한다', () => {
    const desc = buildToolDescription('maencof_create', {
      layer: 2,
      tags: ['ts', 'design'],
    });
    expect(desc).toBe('문서 생성 (L2, tags: ts, design)');
  });

  it('maencof_move를 설명한다', () => {
    const desc = buildToolDescription('maencof_move', { target_layer: 3 });
    expect(desc).toBe('문서 이동 (→ L3)');
  });

  it('kg_build force를 설명한다', () => {
    expect(buildToolDescription('kg_build', { force: true })).toBe(
      '인덱스 전체 재빌드',
    );
    expect(buildToolDescription('kg_build', {})).toBe('인덱스 증분 빌드');
  });

  it('알 수 없는 도구명은 카테고리 또는 도구명을 반환한다', () => {
    expect(buildToolDescription('unknown_tool', {})).toBe('unknown_tool');
  });
});

describe('formatTime', () => {
  it('HH:MM 형식으로 반환한다', () => {
    const d = new Date(2026, 2, 2, 9, 5);
    expect(formatTime(d)).toBe('09:05');
  });
});

describe('formatDate', () => {
  it('YYYY-MM-DD 형식으로 반환한다', () => {
    const d = new Date(2026, 2, 2);
    expect(formatDate(d)).toBe('2026-03-02');
  });
});
