/**
 * @file activityRecorder.test.ts
 * @description activity-recorder hook 로직 테스트 (활동 로그 = NDJSON)
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getActivityEventPath,
  readActivityEvents,
} from '../../core/activityLog/index.js';
import { formatDate } from '../../core/dateFormat/index.js';
import { runActivityRecorder } from '../../hooks/postToolUse/helpers/activityRecorder/activityRecorder.js';

function createTempVault(): string {
  const dir = mkdtempSync(join(tmpdir(), 'maencof-actrec-test-'));
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  return dir;
}

const today = (): string => formatDate(new Date());

describe('runActivityRecorder', () => {
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

  it('vault가 아닌 경우 continue: true를 반환하고 기록하지 않는다', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'non-vault-'));
    try {
      const result = runActivityRecorder({ tool_name: 'create', cwd: tmpDir });
      expect(result.continue).toBe(true);
      expect(existsSync(getActivityEventPath(tmpDir, today()))).toBe(false);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('maencof write 도구 호출 시 활동 로그(JSONL)에 기록한다', () => {
    const result = runActivityRecorder({
      tool_name: 'create',
      tool_input: { layer: 2, tags: ['test'] },
      cwd: vaultDir,
    });

    expect(result.continue).toBe(true);

    const entries = readActivityEvents(vaultDir, today());
    expect(entries).toHaveLength(1);
    expect(entries[0].category).toBe('document');
    expect(entries[0].description).toContain('Document created');
  });

  it('Claude Code 훅이 전달하는 full-form MCP 도구명도 기록한다', () => {
    runActivityRecorder({
      tool_name: 'mcp__plugin_maencof_tools__create',
      tool_input: { layer: 2, tags: ['test'] },
      cwd: vaultDir,
    });

    const entries = readActivityEvents(vaultDir, today());
    expect(entries).toHaveLength(1);
    expect(entries[0].description).toContain('Document created');
  });

  it('타 서버 full-form 도구명(mcp__other-server__create)은 기록하지 않는다', () => {
    runActivityRecorder({
      tool_name: 'mcp__other-server__create',
      tool_input: { layer: 2 },
      cwd: vaultDir,
    });

    expect(existsSync(getActivityEventPath(vaultDir, today()))).toBe(false);
  });

  it('TOOL_CATEGORY_MAP에 없는 도구는 기록하지 않는다', () => {
    const result = runActivityRecorder({
      tool_name: 'unknown_tool',
      cwd: vaultDir,
    });

    expect(result.continue).toBe(true);
    expect(existsSync(getActivityEventPath(vaultDir, today()))).toBe(false);
  });

  it('tool_input에서 path를 추출한다', () => {
    runActivityRecorder({
      tool_name: 'update',
      tool_input: { path: '02_Derived/test.md' },
      cwd: vaultDir,
    });

    const entries = readActivityEvents(vaultDir, today());
    expect(entries[0].path).toBe('02_Derived/test.md');
  });

  it('tool_response에서 path를 추출한다 (create)', () => {
    runActivityRecorder({
      tool_name: 'create',
      tool_input: { layer: 2, tags: ['test'] },
      tool_response: { path: '02_Derived/new.md' },
      cwd: vaultDir,
    });

    const entries = readActivityEvents(vaultDir, today());
    expect(entries[0].path).toBe('02_Derived/new.md');
  });

  it('두 번 호출하면 JSONL에 두 줄이 누적된다', () => {
    runActivityRecorder({
      tool_name: 'create',
      tool_input: { layer: 2 },
      cwd: vaultDir,
    });
    runActivityRecorder({
      tool_name: 'update',
      tool_input: { path: '02_Derived/test.md' },
      cwd: vaultDir,
    });

    const entries = readActivityEvents(vaultDir, today());
    expect(entries).toHaveLength(2);
  });

  it('에러 발생 시 graceful degradation으로 continue: true 반환', () => {
    const result = runActivityRecorder({
      tool_name: 'create',
      tool_input: {},
      cwd: '/nonexistent/path',
    });
    expect(result.continue).toBe(true);
  });

  it('claudemd_merge 호출을 config 카테고리로 기록한다', () => {
    runActivityRecorder({
      tool_name: 'claudemd_merge',
      tool_input: { content: 'test' },
      cwd: vaultDir,
    });

    const entries = readActivityEvents(vaultDir, today());
    expect(entries[0].category).toBe('config');
    expect(entries[0].description).toContain('CLAUDE.md');
  });

  // P4: self-reference guard — maencof 자체 관리 경로는 기록하지 않는다
  it.each([
    ['02_Derived/changelog/2026-04-16.md'],
    ['02_Derived/dailynotes/2026-04-16.md'],
    ['.maencof/stale-nodes.json'],
    ['.maencof-meta/usage-stats.json'],
  ])('exclusion 경로 %s 에 대한 write 는 기록하지 않는다', (path) => {
    const result = runActivityRecorder({
      tool_name: 'update',
      tool_input: { path },
      cwd: vaultDir,
    });

    expect(result.continue).toBe(true);
    expect(existsSync(getActivityEventPath(vaultDir, today()))).toBe(false);
  });

  it('exclusion 외 경로 (03_External/topical/foo.md) 는 정상 기록된다', () => {
    runActivityRecorder({
      tool_name: 'update',
      tool_input: { path: '03_External/topical/foo.md' },
      cwd: vaultDir,
    });

    const entries = readActivityEvents(vaultDir, today());
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe('03_External/topical/foo.md');
  });
});
