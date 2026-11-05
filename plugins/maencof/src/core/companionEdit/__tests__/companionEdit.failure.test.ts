/** @file companionEdit.failure.test.ts 저장 실패 결과와 원본 바이트 보존 회귀 검사. */
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyCompanionEdit } from '../companionEdit.js';

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

describe('applyCompanionEdit storage failures', () => {
  let vaultDir: string;
  let identityPath: string;
  const original = Buffer.from(
    '{\r\n "name": "Nao", "greeting": "Welcome", "role": "advisor"\r\n}\r\n',
  );

  beforeEach(() => {
    vi.resetAllMocks();
    vaultDir = mkdtempSync(join(tmpdir(), 'maencof-edit-failure-'));
    mkdirSync(join(vaultDir, '.maencof-meta'));
    identityPath = join(vaultDir, '.maencof-meta', 'companion-identity.json');
    writeFileSync(identityPath, original);
  });

  afterEach(() => {
    vi.resetAllMocks();
    rmSync(vaultDir, { recursive: true, force: true });
  });

  it.each(['backup', 'partial write', 'rename'])(
    'returns a failure result and preserves original bytes on %s failure',
    (stage) => {
      const failure = new Error(`injected ${stage} failure`);
      if (stage === 'backup')
        vi.mocked(copyFileSync).mockImplementationOnce(() => {
          throw failure;
        });
      else if (stage === 'partial write')
        vi.mocked(writeFileSync).mockImplementationOnce((path) => {
          actualFs.writeFileSync(path, '{"schema_version":');
          throw failure;
        });
      else
        vi.mocked(renameSync).mockImplementationOnce(() => {
          throw failure;
        });

      const result = applyCompanionEdit(vaultDir, {
        operation: 'update_core',
        core: { greeting: 'Hello' },
        commit: true,
      });

      expect(result).toMatchObject({ success: false, committed: false });
      expect(result.errors).toEqual([
        `Failed to save companion-identity.json: ${String(failure)}`,
      ]);
      expect(readFileSync(identityPath)).toEqual(original);
    },
  );
});
