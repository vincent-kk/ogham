/**
 * @file workHistoryRead.test.ts
 * @description work_history MCP 핸들러 — 기간 요약 / 토픽·레이어 이력.
 */
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { appendActivityEntry } from '../../core/activityLog/index.js';
import { buildDailyRollup } from '../../core/workIndex/index.js';
import { handleWorkHistory } from '../../mcp/tools/workHistory/workHistory.js';

let vaultDir: string;

beforeEach(() => {
  vaultDir = mkdtempSync(join(tmpdir(), 'maencof-wh-'));
  mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
});

afterEach(() => {
  rmSync(vaultDir, { recursive: true, force: true });
});

function seedDay(date: string, path: string): void {
  appendActivityEntry(
    vaultDir,
    { time: '10:00', category: 'document', description: 'c', path },
    new Date(`${date}T10:00:00`),
  );
  buildDailyRollup(vaultDir, date);
}

describe('handleWorkHistory', () => {
  it('from/to 기간 요약을 반환한다', () => {
    seedDay('2026-06-20', '01_Core/alpha.md');
    seedDay('2026-06-21', '01_Core/alpha.md');

    const result = handleWorkHistory(vaultDir, {
      from: '2026-06-20',
      to: '2026-06-21',
    });
    expect(result.period).toBeDefined();
    expect(result.period!.activeDays).toBe(2);
    expect(result.period!.topTopics[0].topic).toBe('alpha');
  });

  it('topic 질의는 작업일자 이력을 반환한다', () => {
    seedDay('2026-06-20', '01_Core/alpha.md');
    seedDay('2026-06-22', '01_Core/alpha.md');

    const result = handleWorkHistory(vaultDir, { topic: 'alpha' });
    expect(result.lookup?.kind).toBe('topic');
    expect(result.lookup?.lastWorkedOn).toBe('2026-06-22');
    expect(result.lookup?.dates).toEqual(['2026-06-22', '2026-06-20']);
  });

  it('layer 질의를 지원한다', () => {
    seedDay('2026-06-21', '03_External/topical/beta.md');
    const result = handleWorkHistory(vaultDir, { layer: '03_External' });
    expect(result.lookup?.kind).toBe('layer');
    expect(result.lookup?.lastWorkedOn).toBe('2026-06-21');
  });

  it('데이터가 없으면 활동일 0 의 기간 요약을 반환한다', () => {
    const result = handleWorkHistory(vaultDir, {});
    expect(result.period?.activeDays).toBe(0);
    expect(result.period?.sessionCount).toBe(0);
  });
});
