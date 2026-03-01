/**
 * @file session-hooks.test.ts
 * @description maencof 세션 훅 유닛 테스트 (runSessionStart, runSessionEnd)
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runSessionEnd } from '../../hooks/session-end.js';
import { runSessionStart } from '../../hooks/session-start.js';

/** 테스트용 임시 vault 디렉토리 생성 */
function createTempVault(): string {
  const dir = join(tmpdir(), `maencof-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  return dir;
}

describe('runSessionStart', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('maencof vault가 아닌 경우 setup 안내 메시지를 반환한다', () => {
    const tmpDir = join(tmpdir(), `non-vault-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    try {
      const result = runSessionStart({ cwd: tmpDir });
      expect(result.continue).toBe(true);
      expect(result.message).toContain('setup');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('maencof vault에서는 continue: true를 반환한다', () => {
    const result = runSessionStart({ cwd: vaultDir });
    expect(result.continue).toBe(true);
  });

  it('WAL 파일이 있으면 복구 안내 메시지를 포함한다', () => {
    writeFileSync(join(vaultDir, '.maencof-meta', 'wal.json'), '{}');
    const result = runSessionStart({ cwd: vaultDir });
    expect(result.continue).toBe(true);
    expect(result.message).toContain('WAL');
  });

  it('pending 스케줄이 있으면 organize 안내 메시지를 포함한다', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'schedule-log.json'),
      JSON.stringify({ pending: ['task1', 'task2'] }),
    );
    const result = runSessionStart({ cwd: vaultDir });
    expect(result.continue).toBe(true);
    expect(result.message).toContain('organize');
  });

  it('pending이 없으면 organize 메시지를 포함하지 않는다', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'schedule-log.json'),
      JSON.stringify({ pending: [] }),
    );
    const result = runSessionStart({ cwd: vaultDir });
    expect(result.message ?? '').not.toContain('organize');
  });

  it('companion-identity.json이 있으면 [maencof:이름] 인사말을 포함한다', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'companion-identity.json'),
      JSON.stringify({
        schema_version: 1,
        name: 'Mochi',
        greeting: '오늘도 함께 정리해볼까요?',
      }),
    );
    const result = runSessionStart({ cwd: vaultDir });
    expect(result.message).toContain('[maencof:Mochi]');
    expect(result.message).toContain('오늘도 함께 정리해볼까요?');
  });

  it('companion-identity.json이 없으면 기존 동작 유지', () => {
    const result = runSessionStart({ cwd: vaultDir });
    expect(result.message ?? '').not.toContain('[maencof:');
  });

  it('손상된 companion-identity.json은 graceful하게 무시한다', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'companion-identity.json'),
      '{invalid json',
    );
    const result = runSessionStart({ cwd: vaultDir });
    expect(result.continue).toBe(true);
    expect(result.message ?? '').not.toContain('[maencof:');
  });

  it('스키마 불일치 companion-identity.json은 무시한다', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'companion-identity.json'),
      JSON.stringify({ schema_version: 1, name: '', greeting: 'hi' }),
    );
    const result = runSessionStart({ cwd: vaultDir });
    expect(result.message ?? '').not.toContain('[maencof:');
  });

  it('schema_version 2도 name/greeting을 추출한다 (미래 호환)', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'companion-identity.json'),
      JSON.stringify({
        schema_version: 2,
        name: 'FutureMochi',
        greeting: '미래에서 왔어요!',
        new_field: true,
      }),
    );
    const result = runSessionStart({ cwd: vaultDir });
    expect(result.message).toContain('[maencof:FutureMochi]');
    expect(result.message).toContain('미래에서 왔어요!');
  });
});

describe('runSessionEnd', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('세션 요약 파일을 sessions/ 디렉토리에 저장한다', () => {
    const result = runSessionEnd({
      session_id: 'test-session',
      cwd: vaultDir,
      skills_used: ['/maencof:search'],
      files_modified: ['02_Derived/note.md'],
    });
    expect(result.continue).toBe(true);
    const sessionsDir = join(vaultDir, '.maencof-meta', 'sessions');
    expect(existsSync(sessionsDir)).toBe(true);
    const { readdirSync } = require('node:fs');
    const files = readdirSync(sessionsDir).filter((f: string) =>
      f.endsWith('.md'),
    );
    expect(files.length).toBe(1);
  });

  it('세션 요약에 스킬과 파일 정보가 포함된다', () => {
    runSessionEnd({
      session_id: 'test-session',
      cwd: vaultDir,
      skills_used: ['/maencof:search'],
      files_modified: ['02_Derived/note.md'],
    });
    const sessionsDir = join(vaultDir, '.maencof-meta', 'sessions');
    const { readdirSync, readFileSync } = require('node:fs');
    const files = readdirSync(sessionsDir);
    const content = readFileSync(join(sessionsDir, files[0]), 'utf-8');
    expect(content).toContain('/maencof:search');
    expect(content).toContain('02_Derived/note.md');
  });

  it('maencof vault가 아닌 경우 아무 작업도 하지 않는다', () => {
    const tmpDir = join(tmpdir(), `non-vault-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    try {
      const result = runSessionEnd({ cwd: tmpDir });
      expect(result.continue).toBe(true);
      expect(existsSync(join(tmpDir, '.maencof-meta', 'sessions'))).toBe(false);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
