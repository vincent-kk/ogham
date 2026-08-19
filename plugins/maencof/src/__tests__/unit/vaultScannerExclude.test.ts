/**
 * @file vaultScannerExclude.test.ts
 * @description scanVault 기본 제외 패턴 — 중첩 node_modules 가 vault 문서로 스캔되지 않아야 한다.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { scanVault } from '../../core/vaultScanner/index.js';

let vaultRoot: string;

async function addFile(relativePath: string): Promise<void> {
  const absolutePath = join(vaultRoot, relativePath);
  await mkdir(join(absolutePath, '..'), { recursive: true });
  await writeFile(absolutePath, '# doc\n', 'utf-8');
}

beforeAll(async () => {
  vaultRoot = await mkdtemp(join(tmpdir(), 'maencof-scan-'));
  await addFile('01_Core/identity.md');
  await addFile('04_Action/projects/devlog.md');
  await addFile('node_modules/pkg/README.md');
  await addFile('dashboard/node_modules/fastify/docs/Guide.md');
  await addFile('dashboard/frontend/node_modules/typescript/README.md');
  await addFile('99_Archive/newsletters/stored.md');
  await addFile('notes-root.md');
  await addFile('07_Unknown/mystery.md');
});

afterAll(async () => {
  await rm(vaultRoot, { recursive: true, force: true });
});

describe('scanVault default excludes', () => {
  it('중첩 node_modules 내 md 를 스캔하지 않는다', async () => {
    const files = await scanVault(vaultRoot);
    const paths = files.map((f) => f.relativePath);

    expect(paths).toEqual([
      '01_Core/identity.md',
      '04_Action/projects/devlog.md',
    ]);
  });

  it('레이어 디렉토리 밖(서고·루트·미지 디렉토리) md 를 스캔하지 않는다', async () => {
    const files = await scanVault(vaultRoot);
    const paths = files.map((f) => f.relativePath);

    expect(paths).not.toContain('99_Archive/newsletters/stored.md');
    expect(paths).not.toContain('notes-root.md');
    expect(paths).not.toContain('07_Unknown/mystery.md');
  });

  it('extraExclude 로 추가 디렉토리를 제외할 수 있다', async () => {
    const files = await scanVault(vaultRoot, {
      extraExclude: ['04_Action/**'],
    });
    const paths = files.map((f) => f.relativePath);

    expect(paths).toEqual(['01_Core/identity.md']);
  });
});
