/**
 * @file vault-redirector.test.ts
 * @description vault-redirector PreToolUse 훅 유닛 테스트
 */
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  isVaultDocDirectory,
  isVaultInternalPath,
  runVaultRedirector,
} from '../../hooks/vault-redirector.js';

/** 테스트용 임시 vault 디렉토리 생성 */
function createTempVault(): string {
  const dir = join(tmpdir(), `maencof-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  return dir;
}

describe('isVaultInternalPath', () => {
  const cwd = '/vault';

  it('vault 내부 마크다운 파일을 인식한다', () => {
    expect(isVaultInternalPath(cwd, '01_Core/values.md')).toBe(true);
    expect(isVaultInternalPath(cwd, '/vault/02_Derived/topic.md')).toBe(true);
  });

  it('vault 외부 파일은 false를 반환한다', () => {
    expect(isVaultInternalPath(cwd, '/tmp/other.md')).toBe(false);
  });

  it('.maencof/ 경로는 제외한다', () => {
    expect(isVaultInternalPath(cwd, '.maencof/index.json')).toBe(false);
    expect(isVaultInternalPath(cwd, '.maencof/graph.json')).toBe(false);
  });

  it('.maencof-meta/ 경로는 제외한다', () => {
    expect(
      isVaultInternalPath(cwd, '.maencof-meta/companion-identity.json'),
    ).toBe(false);
  });

  it('비마크다운 파일은 제외한다', () => {
    expect(isVaultInternalPath(cwd, '01_Core/trust-level.json')).toBe(false);
  });

  it('상위 경로 탈출을 감지한다', () => {
    expect(isVaultInternalPath(cwd, '../outside/file.md')).toBe(false);
  });
});

describe('runVaultRedirector', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('vault 내부 Read에 대해 maencof_read를 안내한다', () => {
    const result = runVaultRedirector({
      tool_name: 'Read',
      tool_input: { file_path: '01_Core/values.md' },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'maencof_read',
    );
    expect(result.hookSpecificOutput?.additionalContext).toContain('[maencof]');
  });

  it('vault 외부 Read는 hookSpecificOutput이 없다', () => {
    const result = runVaultRedirector({
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/other.md' },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('vault 내부 Grep에 대해 kg_search를 안내한다', () => {
    const result = runVaultRedirector({
      tool_name: 'Grep',
      tool_input: { path: '02_Derived/topic.md' },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain('kg_search');
  });

  it('vault 내부 Glob에 대해 kg_search 또는 kg_navigate를 안내한다', () => {
    const result = runVaultRedirector({
      tool_name: 'Glob',
      tool_input: { pattern: '03_External/**/*.md', path: vaultDir },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'kg_navigate',
    );
  });

  it('vault 미초기화 디렉토리에서는 즉시 continue: true를 반환한다', () => {
    const nonVaultDir = join(tmpdir(), `non-vault-${Date.now()}`);
    mkdirSync(nonVaultDir, { recursive: true });
    try {
      const result = runVaultRedirector({
        tool_name: 'Read',
        tool_input: { file_path: 'notes.md' },
        cwd: nonVaultDir,
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput).toBeUndefined();
    } finally {
      rmSync(nonVaultDir, { recursive: true, force: true });
    }
  });

  it('.maencof/ 경로는 hookSpecificOutput이 없다', () => {
    const result = runVaultRedirector({
      tool_name: 'Read',
      tool_input: { file_path: '.maencof/index.json' },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('.maencof-meta/ 경로는 hookSpecificOutput이 없다', () => {
    const result = runVaultRedirector({
      tool_name: 'Read',
      tool_input: { file_path: '.maencof-meta/companion-identity.json' },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('절대 경로로 vault 내부 파일을 지정해도 안내한다', () => {
    const result = runVaultRedirector({
      tool_name: 'Read',
      tool_input: { file_path: join(vaultDir, '04_Action/tasks.md') },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'maencof_read',
    );
  });

  it('비마크다운 파일은 hookSpecificOutput이 없다', () => {
    const result = runVaultRedirector({
      tool_name: 'Read',
      tool_input: { file_path: '01_Core/config.json' },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('상위 경로 탈출 시도는 hookSpecificOutput이 없다', () => {
    const result = runVaultRedirector({
      tool_name: 'Read',
      tool_input: { file_path: '../outside/file.md' },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('Glob pattern 필드로 vault 내 .md 검색 시 kg_navigate를 안내한다', () => {
    const result = runVaultRedirector({
      tool_name: 'Glob',
      tool_input: { pattern: '**/*.md' },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'kg_navigate',
    );
    expect(result.hookSpecificOutput?.additionalContext).toContain('**/*.md');
  });

  it('Glob pattern + path 조합으로 vault 하위 디렉토리 검색 시 안내한다', () => {
    const result = runVaultRedirector({
      tool_name: 'Glob',
      tool_input: { pattern: '*.md', path: join(vaultDir, '01_Core') },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'kg_navigate',
    );
  });

  it('Glob pattern이 .md를 포함하지 않으면 hookSpecificOutput이 없다', () => {
    const result = runVaultRedirector({
      tool_name: 'Glob',
      tool_input: { pattern: '**/*.json' },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('Glob path가 .maencof/ 내부이면 hookSpecificOutput이 없다', () => {
    const result = runVaultRedirector({
      tool_name: 'Glob',
      tool_input: { pattern: '*.md', path: join(vaultDir, '.maencof') },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('Glob path가 vault 외부이면 hookSpecificOutput이 없다', () => {
    const result = runVaultRedirector({
      tool_name: 'Glob',
      tool_input: { pattern: '**/*.md', path: '/tmp' },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });
});

describe('isVaultDocDirectory', () => {
  const cwd = '/vault';

  it('vault 루트를 인식한다', () => {
    expect(isVaultDocDirectory(cwd, '/vault')).toBe(true);
    expect(isVaultDocDirectory(cwd, '.')).toBe(true);
  });

  it('vault 하위 문서 디렉토리를 인식한다', () => {
    expect(isVaultDocDirectory(cwd, '01_Core')).toBe(true);
    expect(isVaultDocDirectory(cwd, '/vault/02_Derived')).toBe(true);
  });

  it('.maencof/ 디렉토리는 제외한다', () => {
    expect(isVaultDocDirectory(cwd, '.maencof')).toBe(false);
    expect(isVaultDocDirectory(cwd, '.maencof/subdir')).toBe(false);
  });

  it('.maencof-meta/ 디렉토리는 제외한다', () => {
    expect(isVaultDocDirectory(cwd, '.maencof-meta')).toBe(false);
  });

  it('vault 외부 디렉토리는 false를 반환한다', () => {
    expect(isVaultDocDirectory(cwd, '/tmp')).toBe(false);
    expect(isVaultDocDirectory(cwd, '../outside')).toBe(false);
  });
});
