/**
 * @file hooks.test.ts
 * @description coffaen Hook 유닛 테스트
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runIndexInvalidator } from '../../hooks/index-invalidator.js';
import { runLayerGuard } from '../../hooks/layer-guard.js';
import { runSessionEnd } from '../../hooks/session-end.js';
import { runSessionStart } from '../../hooks/session-start.js';

/** 테스트용 임시 vault 디렉토리 생성 */
function createTempVault(): string {
  const dir = join(tmpdir(), `coffaen-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, '.coffaen'), { recursive: true });
  mkdirSync(join(dir, '.coffaen-meta'), { recursive: true });
  return dir;
}

describe('runSessionStart', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true });
  });

  it('coffaen vault가 아닌 경우 setup 안내 메시지를 반환한다', () => {
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

  it('coffaen vault에서는 continue: true를 반환한다', () => {
    const result = runSessionStart({ cwd: vaultDir });
    expect(result.continue).toBe(true);
  });

  it('WAL 파일이 있으면 복구 안내 메시지를 포함한다', () => {
    writeFileSync(join(vaultDir, '.coffaen-meta', 'wal.json'), '{}');
    const result = runSessionStart({ cwd: vaultDir });
    expect(result.continue).toBe(true);
    expect(result.message).toContain('WAL');
  });

  it('pending 스케줄이 있으면 organize 안내 메시지를 포함한다', () => {
    writeFileSync(
      join(vaultDir, '.coffaen-meta', 'schedule-log.json'),
      JSON.stringify({ pending: ['task1', 'task2'] }),
    );
    const result = runSessionStart({ cwd: vaultDir });
    expect(result.continue).toBe(true);
    expect(result.message).toContain('organize');
  });

  it('pending이 없으면 organize 메시지를 포함하지 않는다', () => {
    writeFileSync(
      join(vaultDir, '.coffaen-meta', 'schedule-log.json'),
      JSON.stringify({ pending: [] }),
    );
    const result = runSessionStart({ cwd: vaultDir });
    expect(result.message ?? '').not.toContain('organize');
  });
});

describe('runLayerGuard', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true });
  });

  it('coffaen vault가 아닌 경우 continue: true를 반환한다', () => {
    const tmpDir = join(tmpdir(), `non-vault-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    try {
      const result = runLayerGuard({
        tool_input: { file_path: '01_Core/values.md' },
        cwd: tmpDir,
      });
      expect(result.continue).toBe(true);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('Layer 1 파일 수정 시 continue: false를 반환한다', () => {
    const result = runLayerGuard({
      tool_name: 'Write',
      tool_input: { file_path: join(vaultDir, '01_Core/values.md') },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(false);
    expect(result.reason).toContain('Layer 1');
  });

  it('Layer 2 파일 수정은 허용한다', () => {
    const result = runLayerGuard({
      tool_name: 'Write',
      tool_input: {
        file_path: join(vaultDir, '02_Derived/skills/programming.md'),
      },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
  });

  it('파일 경로가 없으면 continue: true를 반환한다', () => {
    const result = runLayerGuard({
      tool_name: 'Write',
      tool_input: {},
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
  });
});

describe('runIndexInvalidator', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true });
  });

  it('coffaen MCP 도구 호출 시 stale-nodes.json을 업데이트한다', () => {
    const result = runIndexInvalidator({
      tool_name: 'coffaen_create',
      tool_input: { path: '02_Derived/new-note.md' },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    const stalePath = join(vaultDir, '.coffaen', 'stale-nodes.json');
    expect(existsSync(stalePath)).toBe(true);
    const stale = JSON.parse(
      require('node:fs').readFileSync(stalePath, 'utf-8'),
    );
    expect(stale).toHaveProperty('paths');
    expect(stale).toHaveProperty('updatedAt');
    expect(stale.paths).toContain('02_Derived/new-note.md');
  });

  it('usage-stats.json 카운트를 증가한다', () => {
    runIndexInvalidator({
      tool_name: 'coffaen_update',
      tool_input: { path: '02_Derived/note.md' },
      cwd: vaultDir,
    });
    runIndexInvalidator({
      tool_name: 'coffaen_update',
      tool_input: { path: '02_Derived/note.md' },
      cwd: vaultDir,
    });
    const statsPath = join(vaultDir, '.coffaen-meta', 'usage-stats.json');
    expect(existsSync(statsPath)).toBe(true);
    const stats = JSON.parse(
      require('node:fs').readFileSync(statsPath, 'utf-8'),
    );
    expect(stats['coffaen_update']).toBe(2);
  });

  it('비coffaen 도구는 무시한다', () => {
    const result = runIndexInvalidator({
      tool_name: 'Write',
      tool_input: { path: 'some-file.md' },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    const stalePath = join(vaultDir, '.coffaen', 'stale-nodes.json');
    expect(existsSync(stalePath)).toBe(false);
  });

  it('coffaen_move 시 path로 소스 경로를 stale에 추가한다', () => {
    runIndexInvalidator({
      tool_name: 'coffaen_move',
      tool_input: { path: '03_External/a.md', target_layer: 2 },
      cwd: vaultDir,
    });
    const { readFileSync } = require('node:fs');
    const stalePath = join(vaultDir, '.coffaen', 'stale-nodes.json');
    const stale = JSON.parse(readFileSync(stalePath, 'utf-8'));
    expect(stale.paths).toContain('03_External/a.md');
    expect(stale).toHaveProperty('updatedAt');
  });
});

describe('runSessionEnd', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true });
  });

  it('세션 요약 파일을 sessions/ 디렉토리에 저장한다', () => {
    const result = runSessionEnd({
      session_id: 'test-session',
      cwd: vaultDir,
      skills_used: ['/coffaen:search'],
      files_modified: ['02_Derived/note.md'],
    });
    expect(result.continue).toBe(true);
    const sessionsDir = join(vaultDir, '.coffaen-meta', 'sessions');
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
      skills_used: ['/coffaen:search'],
      files_modified: ['02_Derived/note.md'],
    });
    const sessionsDir = join(vaultDir, '.coffaen-meta', 'sessions');
    const { readdirSync, readFileSync } = require('node:fs');
    const files = readdirSync(sessionsDir);
    const content = readFileSync(join(sessionsDir, files[0]), 'utf-8');
    expect(content).toContain('/coffaen:search');
    expect(content).toContain('02_Derived/note.md');
  });

  it('coffaen vault가 아닌 경우 아무 작업도 하지 않는다', () => {
    const tmpDir = join(tmpdir(), `non-vault-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    try {
      const result = runSessionEnd({ cwd: tmpDir });
      expect(result.continue).toBe(true);
      expect(existsSync(join(tmpDir, '.coffaen-meta', 'sessions'))).toBe(false);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
