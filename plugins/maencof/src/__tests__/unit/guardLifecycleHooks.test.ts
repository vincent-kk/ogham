/**
 * @file guardLifecycleHooks.test.ts
 * @description maencof 레이어 가드 훅 유닛 테스트 (runLayerGuard).
 */
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runLayerGuard } from '../../hooks/preToolUse/helpers/layerGuard/layerGuard.js';

/** 테스트용 임시 vault 디렉토리 생성 */
function createTempVault(): string {
  const dir = mkdtempSync(join(tmpdir(), 'maencof-test-'));
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
    const tmpDir = mkdtempSync(join(tmpdir(), 'non-vault-'));
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
