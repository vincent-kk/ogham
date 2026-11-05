/** @file migrationBackup.test.ts 실행 전 사본과 명시적 바이트 복원 회귀 검사. */
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MigrationPlan } from '../../../types/setup.js';
import { executeMigration } from '../operations/executeMigration.js';
import { rollbackMigration } from '../operations/rollbackMigration.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    copyFileSync: vi.fn(actual.copyFileSync),
    renameSync: vi.fn(actual.renameSync),
    writeFileSync: vi.fn(actual.writeFileSync),
  };
});
/** 실패 주입 중에도 실제 부분 쓰기를 수행하는 파일시스템. */
const actual = await vi.importActual<typeof import('node:fs')>('node:fs');

describe('migration backups', () => {
  let vault: string;
  let source: string;
  let target: string;
  let version: string;
  let plan: MigrationPlan;
  const original = '---\ntitle: "Original"\nsub_layer: \'old\'\n---\n본문\r\n';
  const originalVersion =
    '{ "architecture_version" : "2.0.0", "extra": true }\r\n';

  beforeEach(() => {
    vi.resetAllMocks();
    vault = fs.mkdtempSync(join(tmpdir(), 'maencof-wal-backup-'));
    source = join(vault, 'source.md');
    target = join(vault, 'nested', 'child', 'target.md');
    version = join(vault, 'version.json');
    fs.writeFileSync(source, original);
    fs.writeFileSync(version, originalVersion);
    plan = {
      currentVersion: '2.0.0',
      targetVersion: '3.0.0',
      summary: { dirsToCreate: 0, filesToMove: 1, frontmatterUpdates: 1 },
      operations: [
        {
          type: 'update_frontmatter',
          path: source,
          field: 'sub_layer',
          oldValue: 'old',
          newValue: 'new',
        },
        { type: 'move_file', from: source, to: target },
        {
          type: 'update_version',
          path: version,
          oldVersion: '2.0.0',
          newVersion: '3.0.0',
        },
      ],
    };
  });
  afterEach(() => {
    vi.resetAllMocks();
    fs.rmSync(vault, { recursive: true, force: true });
  });

  it('finishes all copies before the first change and deletes them on success', () => {
    vi.mocked(fs.writeFileSync).mockImplementation((path, data, options) => {
      if (path === source) {
        const root = join(vault, '.maencof-meta', 'migration-backups');
        const run = fs.readdirSync(root)[0];
        const copies = fs
          .readdirSync(join(root, run))
          .map((file) => fs.readFileSync(join(root, run, file), 'utf-8'));
        expect(copies).toContain(original);
        expect(copies).toContain(originalVersion);
      }
      actual.writeFileSync(path, data, options);
    });
    const result = executeMigration(vault, plan);
    expect(result.success).toBe(true);
    expect(
      fs.existsSync(
        join(vault, '.maencof-meta', 'migration-backups', result.walId),
      ),
    ).toBe(false);
  });

  it('keeps failed-run copies and restores exact bytes and missing parents on rollback', () => {
    vi.mocked(fs.writeFileSync).mockImplementation((path, data, options) => {
      if (path === version) {
        actual.writeFileSync(path, '{partial');
        throw new Error('partial version write');
      }
      actual.writeFileSync(path, data, options);
    });
    const result = executeMigration(vault, plan);
    expect(result.success).toBe(false);
    const backup = join(
      vault,
      '.maencof-meta',
      'migration-backups',
      result.walId,
    );
    expect(fs.existsSync(backup)).toBe(true);
    expect(fs.existsSync(target)).toBe(true);
    vi.resetAllMocks();
    expect(rollbackMigration(vault).success).toBe(true);
    expect(fs.readFileSync(source, 'utf-8')).toBe(original);
    expect(fs.readFileSync(version, 'utf-8')).toBe(originalVersion);
    expect(fs.existsSync(join(vault, 'nested'))).toBe(false);
    expect(fs.existsSync(backup)).toBe(false);
    expect(rollbackMigration(vault)).toEqual({ success: true, rolledBack: 0 });
  });

  it('starts no change when a backup copy fails and keeps the failed copy directory', () => {
    vi.mocked(fs.copyFileSync).mockImplementationOnce(() => {
      throw new Error('backup unavailable');
    });
    const result = executeMigration(vault, plan);
    expect(result).toMatchObject({ success: false, operationsExecuted: 0 });
    expect(fs.readFileSync(source, 'utf-8')).toBe(original);
    expect(fs.readFileSync(version, 'utf-8')).toBe(originalVersion);
    const backup = join(
      vault,
      '.maencof-meta',
      'migration-backups',
      result.walId,
    );
    expect(fs.existsSync(backup)).toBe(true);
    expect(rollbackMigration(vault).success).toBe(true);
    expect(fs.existsSync(backup)).toBe(false);
  });

  it('retains copies and allows retry when the final rollback WAL write fails', () => {
    vi.mocked(fs.writeFileSync).mockImplementation((path, data, options) => {
      if (path === version) throw new Error('version unavailable');
      actual.writeFileSync(path, data, options);
    });
    const result = executeMigration(vault, plan);
    expect(result.success).toBe(false);
    vi.resetAllMocks();
    const walPath = join(vault, '.maencof-meta', 'migration-wal.json');
    const backup = join(
      vault,
      '.maencof-meta',
      'migration-backups',
      result.walId,
    );
    vi.mocked(fs.writeFileSync).mockImplementation((path, data, options) => {
      if (path === walPath && JSON.parse(String(data)).status === 'rolled_back')
        throw new Error('final WAL unavailable');
      actual.writeFileSync(path, data, options);
    });

    expect(rollbackMigration(vault)).toMatchObject({
      success: false,
      error: 'final WAL unavailable',
    });
    expect(fs.existsSync(backup)).toBe(true);
    expect(JSON.parse(fs.readFileSync(walPath, 'utf-8')).status).toBe(
      'in_progress',
    );
    expect(fs.readFileSync(source, 'utf-8')).toBe(original);
    vi.resetAllMocks();
    expect(rollbackMigration(vault)).toEqual({ success: true, rolledBack: 0 });
    expect(fs.readFileSync(source, 'utf-8')).toBe(original);
    expect(fs.readFileSync(version, 'utf-8')).toBe(originalVersion);
    expect(JSON.parse(fs.readFileSync(walPath, 'utf-8')).status).toBe(
      'rolled_back',
    );
    expect(fs.existsSync(backup)).toBe(false);
  });

  it('preserves an overwritten move destination and retains copies after a failed rollback', () => {
    fs.mkdirSync(join(vault, 'nested', 'child'), { recursive: true });
    fs.writeFileSync(target, 'destination original');
    vi.mocked(fs.writeFileSync).mockImplementation((path, data, options) => {
      if (path === version) throw new Error('version unavailable');
      actual.writeFileSync(path, data, options);
    });
    const result = executeMigration(vault, plan);
    expect(result.success).toBe(false);
    vi.resetAllMocks();
    vi.mocked(fs.copyFileSync).mockImplementationOnce(() => {
      throw new Error('restore unavailable');
    });
    expect(rollbackMigration(vault).success).toBe(false);
    expect(
      fs.existsSync(
        join(vault, '.maencof-meta', 'migration-backups', result.walId),
      ),
    ).toBe(true);
    expect(rollbackMigration(vault).success).toBe(true);
    expect(fs.readFileSync(source, 'utf-8')).toBe(original);
    expect(fs.readFileSync(target, 'utf-8')).toBe('destination original');
  });
});
