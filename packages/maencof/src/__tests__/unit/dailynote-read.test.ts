/**
 * @file dailynote-read.test.ts
 * @description dailynote_read MCP 도구 핸들러 테스트
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { formatDate, getDailynotePath } from '../../core/dailynote-writer/dailynote-writer.js';
import { handleDailynoteRead } from '../../mcp/tools/dailynote-read/dailynote-read.js';

function createTempVault(): string {
  const dir = join(tmpdir(), `maencof-dnread-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta', 'dailynotes'), { recursive: true });
  return dir;
}

function writeDailynote(vaultDir: string, date: string, content: string): void {
  const filePath = getDailynotePath(vaultDir, date);
  writeFileSync(filePath, content, 'utf-8');
}

const sampleContent = [
  '# Dailynote — 2026-03-02',
  '',
  '## Activity Log',
  '',
  '- **[09:15]** `session` 세션 시작',
  '- **[09:16]** `document` 문서 생성 (L2) → 02_Derived/test.md',
  '- **[10:30]** `config` CLAUDE.md 지시문 병합',
  '- **[10:35]** `session` 세션 종료',
].join('\n');

describe('handleDailynoteRead', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
  });

  it('특정 날짜의 dailynote를 조회한다', () => {
    writeDailynote(vaultDir, '2026-03-02', sampleContent);

    const result = handleDailynoteRead(vaultDir, { date: '2026-03-02' });
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].date).toBe('2026-03-02');
    expect(result.notes[0].entries).toHaveLength(4);
    expect(result.total_entries).toBe(4);
  });

  it('카테고리 필터를 적용한다', () => {
    writeDailynote(vaultDir, '2026-03-02', sampleContent);

    const result = handleDailynoteRead(vaultDir, {
      date: '2026-03-02',
      category: 'session',
    });
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].entries).toHaveLength(2);
    expect(result.notes[0].entries.every((e) => e.category === 'session')).toBe(
      true,
    );
    expect(result.total_entries).toBe(2);
  });

  it('파일이 없으면 빈 결과를 반환한다', () => {
    const result = handleDailynoteRead(vaultDir, { date: '2099-01-01' });
    expect(result.notes).toHaveLength(0);
    expect(result.total_entries).toBe(0);
  });

  it('last_days로 최근 N일을 조회한다', () => {
    const today = formatDate(new Date());
    const yesterday = formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

    const todayContent = [
      `# Dailynote — ${today}`,
      '',
      '## Activity Log',
      '',
      `- **[09:00]** \`session\` 세션 시작`,
    ].join('\n');

    const yesterdayContent = [
      `# Dailynote — ${yesterday}`,
      '',
      '## Activity Log',
      '',
      `- **[10:00]** \`document\` 문서 생성`,
    ].join('\n');

    writeDailynote(vaultDir, today, todayContent);
    writeDailynote(vaultDir, yesterday, yesterdayContent);

    const result = handleDailynoteRead(vaultDir, { last_days: 2 });
    expect(result.notes).toHaveLength(2);
    expect(result.total_entries).toBe(2);
  });

  it('last_days 기본값은 1이다', () => {
    const today = formatDate(new Date());
    const todayContent = [
      `# Dailynote — ${today}`,
      '',
      '## Activity Log',
      '',
      `- **[09:00]** \`session\` 세션 시작`,
    ].join('\n');
    writeDailynote(vaultDir, today, todayContent);

    const result = handleDailynoteRead(vaultDir, {});
    expect(result.notes).toHaveLength(1);
  });

  it('last_days 최대값은 30으로 제한된다', () => {
    const result = handleDailynoteRead(vaultDir, { last_days: 100 });
    // 100을 요청해도 30일만 조회 — 파일이 없으므로 빈 결과
    expect(result.notes).toHaveLength(0);
    expect(result.total_entries).toBe(0);
  });

  it('date와 last_days 동시 지정 시 date가 우선한다', () => {
    writeDailynote(vaultDir, '2026-03-02', sampleContent);

    const result = handleDailynoteRead(vaultDir, {
      date: '2026-03-02',
      last_days: 7,
    });
    // date가 우선하므로 단일 날짜만 조회
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].date).toBe('2026-03-02');
  });
});
