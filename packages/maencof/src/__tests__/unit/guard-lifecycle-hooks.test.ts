/**
 * @file guard-lifecycle-hooks.test.ts
 * @description maencof 레이어 가드 및 인덱스 무효화 훅 유닛 테스트 (runLayerGuard, runIndexInvalidator)
 */
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runIndexInvalidator } from '../../hooks/index-invalidator.js';
import { runLayerGuard } from '../../hooks/layer-guard.js';

/** 테스트용 임시 vault 디렉토리 생성 */
function createTempVault(): string {
  const dir = join(tmpdir(), `maencof-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  return dir;
}

describe('runLayerGuard', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('maencof vault가 아닌 경우 continue: true를 반환한다', () => {
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
    rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('maencof MCP 도구 호출 시 stale-nodes.json을 업데이트한다', () => {
    const result = runIndexInvalidator({
      tool_name: 'maencof_create',
      tool_input: { path: '02_Derived/new-note.md' },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    const stalePath = join(vaultDir, '.maencof', 'stale-nodes.json');
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
      tool_name: 'maencof_update',
      tool_input: { path: '02_Derived/note.md' },
      cwd: vaultDir,
    });
    runIndexInvalidator({
      tool_name: 'maencof_update',
      tool_input: { path: '02_Derived/note.md' },
      cwd: vaultDir,
    });
    const statsPath = join(vaultDir, '.maencof-meta', 'usage-stats.json');
    expect(existsSync(statsPath)).toBe(true);
    const stats = JSON.parse(
      require('node:fs').readFileSync(statsPath, 'utf-8'),
    );
    expect(stats['maencof_update']).toBe(2);
  });

  it('비maencof 도구는 무시한다', () => {
    const result = runIndexInvalidator({
      tool_name: 'Write',
      tool_input: { path: 'some-file.md' },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    const stalePath = join(vaultDir, '.maencof', 'stale-nodes.json');
    expect(existsSync(stalePath)).toBe(false);
  });

  it('maencof_move 시 path로 소스 경로를 stale에 추가한다', () => {
    runIndexInvalidator({
      tool_name: 'maencof_move',
      tool_input: { path: '03_External/a.md', target_layer: 2 },
      cwd: vaultDir,
    });
    const { readFileSync } = require('node:fs');
    const stalePath = join(vaultDir, '.maencof', 'stale-nodes.json');
    const stale = JSON.parse(readFileSync(stalePath, 'utf-8'));
    expect(stale.paths).toContain('03_External/a.md');
    expect(stale).toHaveProperty('updatedAt');
  });
});
