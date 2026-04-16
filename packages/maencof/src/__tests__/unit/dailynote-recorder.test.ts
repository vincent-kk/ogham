/**
 * @file dailynote-recorder.test.ts
 * @description dailynote-recorder hook 로직 테스트
 */
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  formatDate,
  getDailynotePath,
  parseDailynote,
} from '../../core/dailynote-writer/dailynote-writer.js';
import { runDailynoteRecorder } from '../../hooks/dailynote-recorder/dailynote-recorder.js';

function createTempVault(): string {
  const dir = join(tmpdir(), `maencof-dnr-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  return dir;
}

describe('runDailynoteRecorder', () => {
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
    const tmpDir = join(tmpdir(), `non-vault-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    try {
      const result = runDailynoteRecorder({
        tool_name: 'create',
        cwd: tmpDir,
      });
      expect(result.continue).toBe(true);
      const today = formatDate(new Date());
      expect(existsSync(getDailynotePath(tmpDir, today))).toBe(false);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('maencof write 도구 호출 시 dailynote에 기록한다', () => {
    const result = runDailynoteRecorder({
      tool_name: 'create',
      tool_input: { layer: 2, tags: ['test'] },
      cwd: vaultDir,
    });

    expect(result.continue).toBe(true);

    const today = formatDate(new Date());
    const content = readFileSync(getDailynotePath(vaultDir, today), 'utf-8');
    const entries = parseDailynote(content);
    expect(entries).toHaveLength(1);
    expect(entries[0].category).toBe('document');
    expect(entries[0].description).toContain('Document created');
  });

  it('TOOL_CATEGORY_MAP에 없는 도구는 기록하지 않는다', () => {
    const result = runDailynoteRecorder({
      tool_name: 'unknown_tool',
      cwd: vaultDir,
    });

    expect(result.continue).toBe(true);
    const today = formatDate(new Date());
    expect(existsSync(getDailynotePath(vaultDir, today))).toBe(false);
  });

  it('tool_input에서 path를 추출한다', () => {
    runDailynoteRecorder({
      tool_name: 'update',
      tool_input: { path: '02_Derived/test.md' },
      cwd: vaultDir,
    });

    const today = formatDate(new Date());
    const content = readFileSync(getDailynotePath(vaultDir, today), 'utf-8');
    const entries = parseDailynote(content);
    expect(entries[0].path).toBe('02_Derived/test.md');
  });

  it('tool_response에서 path를 추출한다 (create)', () => {
    runDailynoteRecorder({
      tool_name: 'create',
      tool_input: { layer: 2, tags: ['test'] },
      tool_response: { path: '02_Derived/new.md' },
      cwd: vaultDir,
    });

    const today = formatDate(new Date());
    const content = readFileSync(getDailynotePath(vaultDir, today), 'utf-8');
    const entries = parseDailynote(content);
    expect(entries[0].path).toBe('02_Derived/new.md');
  });

  it('에러 발생 시 graceful degradation으로 continue: true 반환', () => {
    // cwd를 존재하지 않는 경로로 설정하되 vault처럼 보이게 하지 않음
    const result = runDailynoteRecorder({
      tool_name: 'create',
      tool_input: {},
      cwd: '/nonexistent/path',
    });
    expect(result.continue).toBe(true);
  });

  it('claudemd_merge 호출을 config 카테고리로 기록한다', () => {
    runDailynoteRecorder({
      tool_name: 'claudemd_merge',
      tool_input: { content: 'test' },
      cwd: vaultDir,
    });

    const today = formatDate(new Date());
    const content = readFileSync(getDailynotePath(vaultDir, today), 'utf-8');
    const entries = parseDailynote(content);
    expect(entries[0].category).toBe('config');
    expect(entries[0].description).toContain('CLAUDE.md');
  });

  // P4: self-reference guard — maencof 자체 관리 경로는 기록하지 않는다
  it.each([
    ['02_Derived/changelog/2026-04-16.md'],
    ['02_Derived/dailynotes/2026-04-16.md'],
    ['.maencof/stale-nodes.json'],
    ['.maencof-meta/usage-stats.json'],
  ])('exclusion 경로 %s 에 대한 write 는 dailynote 에 기록하지 않는다', (path) => {
    const result = runDailynoteRecorder({
      tool_name: 'update',
      tool_input: { path },
      cwd: vaultDir,
    });

    expect(result.continue).toBe(true);
    const today = formatDate(new Date());
    expect(existsSync(getDailynotePath(vaultDir, today))).toBe(false);
  });

  it('exclusion 외 경로 (03_External/topical/foo.md) 는 정상 기록된다', () => {
    runDailynoteRecorder({
      tool_name: 'update',
      tool_input: { path: '03_External/topical/foo.md' },
      cwd: vaultDir,
    });

    const today = formatDate(new Date());
    const content = readFileSync(getDailynotePath(vaultDir, today), 'utf-8');
    const entries = parseDailynote(content);
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe('03_External/topical/foo.md');
  });
});
