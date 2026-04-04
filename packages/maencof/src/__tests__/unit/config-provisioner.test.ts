/**
 * @file config-provisioner.test.ts
 * @description provisionMissingConfigs() 유닛 테스트
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { provisionMissingConfigs } from '../../hooks/config-provisioner/config-provisioner.js';
import { CONFIG_REGISTRY } from '../../hooks/config-registry/config-registry.js';

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

  it('이미 존재하는 파일은 건너뛴다 (최신 schemaVersion)', () => {
    mkdirSync(metaDir(cwd), { recursive: true });
    writeFileSync(
      join(metaDir(cwd), 'insight-config.json'),
      JSON.stringify({ enabled: false, _schemaVersion: 1 }),
      'utf-8',
    );

    const result = provisionMissingConfigs(cwd);

    expect(result.skipped).toContain('insight-config.json');
    expect(result.created).not.toContain('insight-config.json');
    expect(result.migrated).not.toContain('insight-config.json');
  });

  it('최신 schemaVersion 파일의 내용은 수정하지 않는다', () => {
    mkdirSync(metaDir(cwd), { recursive: true });
    const originalContent = JSON.stringify({
      enabled: false,
      custom: 'preserved',
      _schemaVersion: 1,
    });
    writeFileSync(
      join(metaDir(cwd), 'insight-config.json'),
      originalContent,
      'utf-8',
    );

    provisionMissingConfigs(cwd);

    const afterContent = readFileSync(
      join(metaDir(cwd), 'insight-config.json'),
      'utf-8',
    );
    expect(JSON.parse(afterContent)).toEqual(JSON.parse(originalContent));
  });

  it('생성된 파일들은 유효한 JSON을 포함한다', () => {
    const result = provisionMissingConfigs(cwd);

    for (const filename of result.created) {
      const content = readFileSync(join(metaDir(cwd), filename), 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    }
  });

  it('반환값의 created/skipped/migrated 배열이 정확하다', () => {
    mkdirSync(metaDir(cwd), { recursive: true });
    writeFileSync(
      join(metaDir(cwd), 'vault-commit.json'),
      JSON.stringify({ enabled: true, _schemaVersion: 1 }),
      'utf-8',
    );
    writeFileSync(
      join(metaDir(cwd), 'lifecycle.json'),
      JSON.stringify({ version: 1, actions: [], _schemaVersion: 1 }),
      'utf-8',
    );

    const result = provisionMissingConfigs(cwd);

    expect(result.skipped).toContain('vault-commit.json');
    expect(result.skipped).toContain('lifecycle.json');
    expect(result.created).not.toContain('vault-commit.json');
    expect(result.created).not.toContain('lifecycle.json');
    expect(
      result.created.length + result.skipped.length + result.migrated.length,
    ).toBe(CONFIG_REGISTRY.length);
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
    // 3개 파일을 최신 schemaVersion으로 미리 생성
    writeFileSync(
      join(metaDir(cwd), 'insight-config.json'),
      JSON.stringify({ enabled: true, _schemaVersion: 1 }),
      'utf-8',
    );
    writeFileSync(
      join(metaDir(cwd), 'vault-commit.json'),
      JSON.stringify({ enabled: false, _schemaVersion: 1 }),
      'utf-8',
    );
    writeFileSync(
      join(metaDir(cwd), 'data-sources.json'),
      JSON.stringify({
        sources: [],
        updatedAt: new Date().toISOString(),
        _schemaVersion: 1,
      }),
      'utf-8',
    );

    const result = provisionMissingConfigs(cwd);

    expect(result.skipped).toHaveLength(3);
    expect(result.created).toHaveLength(3);
    expect(result.migrated).toHaveLength(0);
    expect(result.skipped).toContain('insight-config.json');
    expect(result.skipped).toContain('vault-commit.json');
    expect(result.skipped).toContain('data-sources.json');
    expect(result.created).toContain('auto-insight-stats.json');
    expect(result.created).toContain('lifecycle.json');
    expect(result.created).toContain('usage-stats.json');
  });
});

// ─── Migration (schemaVersion) ─────────────────────────────────────────────────

describe('provisionMissingConfigs — migration', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
    mkdirSync(metaDir(cwd), { recursive: true });
  });

  afterEach(() => {
    removeDir(cwd);
  });

  it('_schemaVersion이 없는 파일은 migrated에 포함된다', () => {
    writeFileSync(
      join(metaDir(cwd), 'insight-config.json'),
      JSON.stringify({ enabled: false }),
      'utf-8',
    );

    const result = provisionMissingConfigs(cwd);

    expect(result.migrated).toContain('insight-config.json');
    expect(result.skipped).not.toContain('insight-config.json');
  });

  it('낮은 _schemaVersion 파일은 migrated에 포함된다', () => {
    writeFileSync(
      join(metaDir(cwd), 'vault-commit.json'),
      JSON.stringify({ enabled: false, _schemaVersion: 0 }),
      'utf-8',
    );

    const result = provisionMissingConfigs(cwd);

    expect(result.migrated).toContain('vault-commit.json');
    expect(result.skipped).not.toContain('vault-commit.json');
  });

  it('최신 _schemaVersion 파일은 skipped에 포함된다', () => {
    const entry = CONFIG_REGISTRY.find(
      (e) => e.filename === 'vault-commit.json',
    )!;
    writeFileSync(
      join(metaDir(cwd), 'vault-commit.json'),
      JSON.stringify({ enabled: false, _schemaVersion: entry.schemaVersion }),
      'utf-8',
    );

    const result = provisionMissingConfigs(cwd);

    expect(result.skipped).toContain('vault-commit.json');
    expect(result.migrated).not.toContain('vault-commit.json');
  });

  it('migration 후 기존 키는 보존되고 누락된 키는 추가된다', () => {
    writeFileSync(
      join(metaDir(cwd), 'insight-config.json'),
      JSON.stringify({ enabled: true, customKey: 'preserved' }),
      'utf-8',
    );

    provisionMissingConfigs(cwd);

    const after = JSON.parse(
      readFileSync(join(metaDir(cwd), 'insight-config.json'), 'utf-8'),
    );
    expect(after.enabled).toBe(true); // 기존 값 보존
    expect(after.customKey).toBe('preserved'); // 사용자 정의 키 보존
    expect(after).toHaveProperty('_schemaVersion'); // 스키마 버전 추가
  });

  it('migration 후 _schemaVersion이 최신 버전으로 업데이트된다', () => {
    const entry = CONFIG_REGISTRY.find(
      (e) => e.filename === 'insight-config.json',
    )!;
    writeFileSync(
      join(metaDir(cwd), 'insight-config.json'),
      JSON.stringify({ enabled: false, _schemaVersion: 0 }),
      'utf-8',
    );

    provisionMissingConfigs(cwd);

    const after = JSON.parse(
      readFileSync(join(metaDir(cwd), 'insight-config.json'), 'utf-8'),
    );
    expect(after._schemaVersion).toBe(entry.schemaVersion);
  });

  it('손상된 JSON 파일은 skipped에 포함되고 에러를 던지지 않는다', () => {
    writeFileSync(
      join(metaDir(cwd), 'insight-config.json'),
      'NOT_VALID_JSON',
      'utf-8',
    );

    let result: ReturnType<typeof provisionMissingConfigs> | undefined;
    expect(() => {
      result = provisionMissingConfigs(cwd);
    }).not.toThrow();

    expect(result!.skipped).toContain('insight-config.json');
    expect(result!.migrated).not.toContain('insight-config.json');
  });

  it('개별 파일 마이그레이션 실패 시 나머지는 계속 처리한다', () => {
    // insight-config.json은 손상된 JSON, vault-commit.json은 정상 stale
    writeFileSync(
      join(metaDir(cwd), 'insight-config.json'),
      'NOT_VALID_JSON',
      'utf-8',
    );
    writeFileSync(
      join(metaDir(cwd), 'vault-commit.json'),
      JSON.stringify({ enabled: false }), // no _schemaVersion → migrated
      'utf-8',
    );

    let result: ReturnType<typeof provisionMissingConfigs> | undefined;
    expect(() => {
      result = provisionMissingConfigs(cwd);
    }).not.toThrow();

    // insight-config.json 실패해도 vault-commit.json은 migrated 처리
    expect(result!.migrated).toContain('vault-commit.json');
    expect(result!.skipped).toContain('insight-config.json');
  });

  it('usage-stats.json은 schemaVersion이 없으므로 migration을 건너뛴다', () => {
    // usage-stats.json을 schemaVersion 없이 미리 생성
    writeFileSync(
      join(metaDir(cwd), 'usage-stats.json'),
      JSON.stringify({ someTool: 3 }),
      'utf-8',
    );

    const result = provisionMissingConfigs(cwd);

    // schemaVersion 없는 entry는 skipped
    expect(result.skipped).toContain('usage-stats.json');
    expect(result.migrated).not.toContain('usage-stats.json');
  });

  it('usage-stats.json에 _schemaVersion 필드가 추가되지 않는다', () => {
    writeFileSync(
      join(metaDir(cwd), 'usage-stats.json'),
      JSON.stringify({ someTool: 5 }),
      'utf-8',
    );

    provisionMissingConfigs(cwd);

    const after = JSON.parse(
      readFileSync(join(metaDir(cwd), 'usage-stats.json'), 'utf-8'),
    );
    expect(after).not.toHaveProperty('_schemaVersion');
    expect(after.someTool).toBe(5); // 기존 값 보존
  });
});
