/**
 * @file vaultCommitterConfig.test.ts
 * @description vault-committer 설정 파싱·프롬프트 게이트 유닛 테스트
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isClearCommand,
  readVaultCommitConfig,
  shouldCommitOnPrompt,
} from '../../hooks/utils/vaultCommitter/index.js';

// vaultCommitter 모듈 그래프는 gitUtils 를 통해 spawnCli 를 로드한다. 설정·게이트
// 경로만 검증하는 파일이지만 실제 git 실행 경로는 끊어 둔다.
vi.mock('@ogham/cross-platform', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ogham/cross-platform')>()),
  spawnCli: vi.fn(),
}));

// ── Helpers ──────────────────────────────────────────────────────────

function createTempVault(): string {
  const dir = join(
    tmpdir(),
    `maencof-vc-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  );
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  mkdirSync(join(dir, '01_Core'), { recursive: true });
  return dir;
}

function enableVaultCommit(cwd: string): void {
  writeFileSync(
    join(cwd, '.maencof-meta', 'vault-commit.json'),
    JSON.stringify({ enabled: true }),
  );
}

// ── Tests ────────────────────────────────────────────────────────────

describe('readVaultCommitConfig', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('returns null when config file is missing', () => {
    expect(readVaultCommitConfig(vaultDir)).toBeNull();
  });

  it('returns config when file has enabled: true', () => {
    enableVaultCommit(vaultDir);
    const config = readVaultCommitConfig(vaultDir);
    expect(config).toEqual({ enabled: true });
  });

  it('returns config when file has enabled: false', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({ enabled: false }),
    );
    const config = readVaultCommitConfig(vaultDir);
    expect(config).toEqual({ enabled: false });
  });

  it('returns null for malformed JSON', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      '{invalid json',
    );
    expect(readVaultCommitConfig(vaultDir)).toBeNull();
  });

  it('returns null for JSON without enabled field', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({ active: true }),
    );
    expect(readVaultCommitConfig(vaultDir)).toBeNull();
  });

  it('Y3: picks up skip_patterns string[] from config', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({
        enabled: true,
        skip_patterns: ['^/resetthing\\b', '^/wrap\\s*$'],
      }),
    );
    const config = readVaultCommitConfig(vaultDir);
    expect(config?.skip_patterns).toEqual(['^/resetthing\\b', '^/wrap\\s*$']);
  });

  it('Y3: drops non-string skip_patterns entries', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({
        enabled: true,
        skip_patterns: ['^/ok$', 42, null, '', '^/ok2$'],
      }),
    );
    const config = readVaultCommitConfig(vaultDir);
    expect(config?.skip_patterns).toEqual(['^/ok$', '^/ok2$']);
  });

  it('Y3: empty skip_patterns array falls back to default (absent field)', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({ enabled: true, skip_patterns: [] }),
    );
    const config = readVaultCommitConfig(vaultDir);
    expect(config?.skip_patterns).toBeUndefined();
  });

  it('picks up scope entries and drops unsafe ones item-by-item', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({
        enabled: true,
        scope: ['01_Core/', '/abs', '../up', 'a:b', '.git/hooks', 42, 'valid/'],
      }),
    );
    const config = readVaultCommitConfig(vaultDir);
    expect(config?.scope).toEqual(['01_Core/', 'valid/']);
  });

  it('picks up message_template with a sufficiently long static prefix', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({
        enabled: true,
        message_template: 'vault: wrap [{dirs}] ({date})',
      }),
    );
    expect(readVaultCommitConfig(vaultDir)?.message_template).toBe(
      'vault: wrap [{dirs}] ({date})',
    );
  });

  it('drops message_template whose static prefix is too short to be a safe fold marker', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({ enabled: true, message_template: 'up: {dirs}' }),
    );
    expect(readVaultCommitConfig(vaultDir)?.message_template).toBeUndefined();
  });

  it('picks up fold_daily boolean and ignores non-boolean values', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({ enabled: true, fold_daily: false }),
    );
    expect(readVaultCommitConfig(vaultDir)?.fold_daily).toBe(false);

    writeFileSync(
      join(vaultDir, '.maencof-meta', 'vault-commit.json'),
      JSON.stringify({ enabled: true, fold_daily: 'yes' }),
    );
    expect(readVaultCommitConfig(vaultDir)?.fold_daily).toBeUndefined();
  });
});

describe('shouldCommitOnPrompt (Y3)', () => {
  it('기본 config(skip_patterns 없음) 에서는 /clear 만 매칭한다', () => {
    expect(shouldCommitOnPrompt('/clear', null)).toBe(true);
    expect(shouldCommitOnPrompt('/clear ', null)).toBe(true);
    expect(shouldCommitOnPrompt('  /clear  ', null)).toBe(true);
    expect(shouldCommitOnPrompt('/CLEAR', null)).toBe(true);
    expect(shouldCommitOnPrompt('fix the bug', null)).toBe(false);
    expect(shouldCommitOnPrompt('/clear something', null)).toBe(false);
  });

  it('사용자 custom skip_patterns 로 /resetthing 을 등록하면 매칭한다', () => {
    const config = {
      enabled: true,
      skip_patterns: ['^\\s*/resetthing\\s*$'],
    };
    expect(shouldCommitOnPrompt('/resetthing', config)).toBe(true);
    expect(shouldCommitOnPrompt('/clear', config)).toBe(false);
  });

  it('malformed regex 는 조용히 skip 되고 나머지 패턴만 사용한다', () => {
    const config = {
      enabled: true,
      skip_patterns: ['[invalid', '^/wrap\\s*$'],
    };
    expect(shouldCommitOnPrompt('/wrap', config)).toBe(true);
    expect(shouldCommitOnPrompt('[invalid', config)).toBe(false);
  });
});

describe('isClearCommand', () => {
  it('returns true for "/clear"', () => {
    expect(isClearCommand('/clear')).toBe(true);
  });

  it('returns true for "/clear" with trailing whitespace', () => {
    expect(isClearCommand('/clear  ')).toBe(true);
  });

  it('returns true for "/clear" with leading whitespace', () => {
    expect(isClearCommand('  /clear')).toBe(true);
  });

  it('returns true for "/CLEAR" (case insensitive)', () => {
    expect(isClearCommand('/CLEAR')).toBe(true);
  });

  it('returns false for "/clear something"', () => {
    expect(isClearCommand('/clear something')).toBe(false);
  });

  it('returns false for "please /clear"', () => {
    expect(isClearCommand('please /clear')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isClearCommand('')).toBe(false);
  });

  it('returns false for unrelated prompt', () => {
    expect(isClearCommand('fix the bug')).toBe(false);
  });
});
