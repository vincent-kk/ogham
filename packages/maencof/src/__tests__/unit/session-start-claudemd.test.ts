/**
 * @file session-start-claudemd.test.ts
 * @description session-start hook의 CLAUDE.md 초기화 테스트
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  MAENCOF_END_MARKER,
  MAENCOF_START_MARKER,
} from '../../core/claude-md-merger.js';
import { runSessionStart } from '../../hooks/session-start.js';

/** 테스트용 임시 vault 디렉토리 생성 */
function createTempVault(): string {
  const dir = join(tmpdir(), `maencof-claudemd-init-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  return dir;
}

describe('session-start CLAUDE.md 초기화', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('vault에 CLAUDE.md가 없으면 maencof 섹션을 포함한 CLAUDE.md를 생성한다', () => {
    runSessionStart({ cwd: vaultDir });

    const claudeMd = join(vaultDir, 'CLAUDE.md');
    expect(existsSync(claudeMd)).toBe(true);

    const content = readFileSync(claudeMd, 'utf-8');
    expect(content).toContain(MAENCOF_START_MARKER);
    expect(content).toContain(MAENCOF_END_MARKER);
    expect(content).toContain('maencof Knowledge Space');
    expect(content).toContain('kg_suggest_links');
    expect(content).toContain('claudemd_merge');
  });

  it('기존 CLAUDE.md에 maencof 섹션이 없으면 추가한다', () => {
    writeFileSync(join(vaultDir, 'CLAUDE.md'), '# My Project\n\nExisting content.\n', 'utf-8');

    runSessionStart({ cwd: vaultDir });

    const content = readFileSync(join(vaultDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('# My Project');
    expect(content).toContain('Existing content.');
    expect(content).toContain(MAENCOF_START_MARKER);
    expect(content).toContain('maencof Knowledge Space');
  });

  it('이미 maencof 섹션이 있으면 변경하지 않는다', () => {
    const existing = `# Project\n\n${MAENCOF_START_MARKER}\ncustom directive\n${MAENCOF_END_MARKER}\n`;
    writeFileSync(join(vaultDir, 'CLAUDE.md'), existing, 'utf-8');

    runSessionStart({ cwd: vaultDir });

    const content = readFileSync(join(vaultDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('custom directive');
    // 기본 지시문이 삽입되지 않아야 함
    expect(content).not.toContain('maencof Knowledge Space');
  });

  it('vault가 아닌 경우 CLAUDE.md를 건드리지 않는다', () => {
    const nonVaultDir = join(tmpdir(), `non-vault-claudemd-${Date.now()}`);
    mkdirSync(nonVaultDir, { recursive: true });
    try {
      runSessionStart({ cwd: nonVaultDir });
      expect(existsSync(join(nonVaultDir, 'CLAUDE.md'))).toBe(false);
    } finally {
      rmSync(nonVaultDir, { recursive: true, force: true });
    }
  });

  it('companion identity가 있으면 지시문에 이름이 포함된다', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'companion-identity.json'),
      JSON.stringify({
        schema_version: 1,
        name: 'Mochi',
        greeting: '안녕!',
      }),
    );

    runSessionStart({ cwd: vaultDir });

    const content = readFileSync(join(vaultDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('maencof Knowledge Space (Mochi)');
  });

  it('초기화 메시지가 반환된다', () => {
    const result = runSessionStart({ cwd: vaultDir });
    expect(result.message).toContain('CLAUDE.md');
    expect(result.message).toContain('초기화');
  });
});
