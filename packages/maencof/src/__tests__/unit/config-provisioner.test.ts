/**
 * @file config-provisioner.test.ts
 * @description provisionMissingConfigs() 유닛 테스트
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CONFIG_REGISTRY } from '../../hooks/config-registry.js';
import { provisionMissingConfigs } from '../../hooks/config-provisioner.js';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'maencof-provisioner-test-'));
}

function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

function metaDir(cwd: string): string {
  return join(cwd, '.maencof-meta');
}

// ─── provisionMissingConfigs ──────────────────────────────────────────────────

describe('provisionMissingConfigs', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
  });

  afterEach(() => {
    removeDir(cwd);
  });

  it('빈 .maencof-meta/ 디렉토리에 6개의 config 파일을 모두 생성한다', () => {
    mkdirSync(metaDir(cwd), { recursive: true });

    const result = provisionMissingConfigs(cwd);

    expect(result.created).toHaveLength(6);
    expect(result.skipped).toHaveLength(0);

    const expectedFiles = [
      'insight-config.json',
      'auto-insight-stats.json',
      'vault-commit.json',
      'lifecycle.json',
      'data-sources.json',
      'usage-stats.json',
    ];
    for (const filename of expectedFiles) {
      expect(existsSync(join(metaDir(cwd), filename))).toBe(true);
    }
  });

  it('이미 존재하는 파일은 건너뛴다', () => {
    mkdirSync(metaDir(cwd), { recursive: true });
    writeFileSync(join(metaDir(cwd), 'insight-config.json'), '{"enabled":false}', 'utf-8');

    const result = provisionMissingConfigs(cwd);

    expect(result.skipped).toContain('insight-config.json');
    expect(result.created).not.toContain('insight-config.json');
  });

  it('기존 파일의 내용은 수정하지 않는다', () => {
    mkdirSync(metaDir(cwd), { recursive: true });
    const originalContent = '{"enabled":false,"custom":"preserved"}';
    writeFileSync(join(metaDir(cwd), 'insight-config.json'), originalContent, 'utf-8');

    provisionMissingConfigs(cwd);

    const afterContent = readFileSync(join(metaDir(cwd), 'insight-config.json'), 'utf-8');
    expect(afterContent).toBe(originalContent);
  });

  it('.maencof-meta/ 디렉토리가 없어도 자동으로 생성한다', () => {
    // metaDir을 생성하지 않음
    expect(existsSync(metaDir(cwd))).toBe(false);

    const result = provisionMissingConfigs(cwd);

    expect(existsSync(metaDir(cwd))).toBe(true);
    expect(result.created).toHaveLength(6);
  });

  it('생성된 파일들은 유효한 JSON을 포함한다', () => {
    const result = provisionMissingConfigs(cwd);

    for (const filename of result.created) {
      const content = readFileSync(join(metaDir(cwd), filename), 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    }
  });

  it('반환값의 created/skipped 배열이 정확하다', () => {
    mkdirSync(metaDir(cwd), { recursive: true });
    writeFileSync(join(metaDir(cwd), 'vault-commit.json'), '{}', 'utf-8');
    writeFileSync(join(metaDir(cwd), 'lifecycle.json'), '{}', 'utf-8');

    const result = provisionMissingConfigs(cwd);

    expect(result.skipped).toContain('vault-commit.json');
    expect(result.skipped).toContain('lifecycle.json');
    expect(result.created).not.toContain('vault-commit.json');
    expect(result.created).not.toContain('lifecycle.json');
    expect(result.created.length + result.skipped.length).toBe(CONFIG_REGISTRY.length);
  });

  it('생성된 각 파일의 내용이 registry default와 일치한다 (key shape 검증)', () => {
    provisionMissingConfigs(cwd);

    for (const entry of CONFIG_REGISTRY) {
      const filePath = join(metaDir(cwd), entry.filename);
      const content = JSON.parse(readFileSync(filePath, 'utf-8'));
      const defaultValue = entry.defaultValue();

      // 기본값의 모든 key가 생성된 파일에 존재하는지 확인
      for (const key of Object.keys(defaultValue)) {
        expect(content).toHaveProperty(key);
      }
    }
  });

  it('두 번 호출해도 멱등성이 보장된다 (두 번째 호출: 모두 skipped)', () => {
    const first = provisionMissingConfigs(cwd);
    expect(first.created).toHaveLength(6);
    expect(first.skipped).toHaveLength(0);

    const second = provisionMissingConfigs(cwd);
    expect(second.created).toHaveLength(0);
    expect(second.skipped).toHaveLength(6);
  });

  it('부분 프로비저닝: 일부 파일만 존재할 때 나머지만 생성한다', () => {
    mkdirSync(metaDir(cwd), { recursive: true });
    // 3개 파일만 미리 생성
    writeFileSync(join(metaDir(cwd), 'insight-config.json'), '{}', 'utf-8');
    writeFileSync(join(metaDir(cwd), 'vault-commit.json'), '{}', 'utf-8');
    writeFileSync(join(metaDir(cwd), 'data-sources.json'), '{}', 'utf-8');

    const result = provisionMissingConfigs(cwd);

    expect(result.skipped).toHaveLength(3);
    expect(result.created).toHaveLength(3);
    expect(result.skipped).toContain('insight-config.json');
    expect(result.skipped).toContain('vault-commit.json');
    expect(result.skipped).toContain('data-sources.json');
    expect(result.created).toContain('auto-insight-stats.json');
    expect(result.created).toContain('lifecycle.json');
    expect(result.created).toContain('usage-stats.json');
  });
});
