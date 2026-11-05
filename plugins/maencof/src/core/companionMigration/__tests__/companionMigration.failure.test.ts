/** @file companionMigration.failure.test.ts 저장 실패 시 원본 바이트 보존 회귀 검사. */
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runCompanionMigration } from '../companionMigration.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    copyFileSync: vi.fn(actual.copyFileSync),
    renameSync: vi.fn(actual.renameSync),
    writeFileSync: vi.fn(actual.writeFileSync),
  };
});

/** 부분 쓰기를 실제 디스크에 재현하는 원본 파일시스템 함수. */
const actualFs = await vi.importActual<typeof import('node:fs')>('node:fs');

describe('runCompanionMigration storage failures', () => {
  let vaultDir: string;
  let identityPath: string;
  const original = Buffer.from(
    '{\r\n "name": "Nao", "greeting": "Welcome", "role": "advisor"\r\n}\r\n',
  );

  beforeEach(() => {
    vi.resetAllMocks();
    vaultDir = mkdtempSync(join(tmpdir(), 'maencof-migration-failure-'));
    mkdirSync(join(vaultDir, '.maencof-meta'));
    identityPath = join(vaultDir, '.maencof-meta', 'companion-identity.json');
    writeFileSync(identityPath, original);
  });

  afterEach(() => {
    vi.resetAllMocks();
    rmSync(vaultDir, { recursive: true, force: true });
  });

  it('preserves the original bytes when a write partially succeeds then fails', () => {
    vi.mocked(writeFileSync).mockImplementationOnce((path) => {
      actualFs.writeFileSync(path, '{"schema_version":');
      throw new Error('injected partial write failure');
    });

    expect(runCompanionMigration(vaultDir)).toEqual({
      migrated: false,
      reason: 'error',
    });
    expect(readFileSync(identityPath)).toEqual(original);
    const backup = readdirSync(join(vaultDir, '.maencof-meta')).find((name) =>
      name.startsWith('companion-identity.json.bak-'),
    );
    expect(backup).toBeDefined();
    expect(readFileSync(join(vaultDir, '.maencof-meta', backup!))).toEqual(
      original,
    );
  });

  it('preserves the original bytes when the final rename fails', () => {
    vi.mocked(renameSync).mockImplementationOnce(() => {
      throw new Error('injected rename failure');
    });

    expect(runCompanionMigration(vaultDir)).toEqual({
      migrated: false,
      reason: 'error',
    });
    expect(readFileSync(identityPath)).toEqual(original);
  });

  it('preserves the original bytes when the backup fails', () => {
    vi.mocked(copyFileSync).mockImplementationOnce(() => {
      throw new Error('injected backup failure');
    });

    expect(runCompanionMigration(vaultDir)).toEqual({
      migrated: false,
      reason: 'error',
    });
    expect(readFileSync(identityPath)).toEqual(original);
  });
});
