/**
 * @file scanArchive.test.ts
 * @description scanArchive 스캔 경계 — 서고만 잡히고, scanVault 는 여전히 서고를 잡지 않는다.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { scanArchive, scanVault } from '../../core/vaultScanner/index.js';

describe('scanArchive', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await mkdtemp(join(tmpdir(), 'maencof-scan-archive-'));
    await mkdir(join(vault, '04_Action'), { recursive: true });
    await mkdir(join(vault, '99_Archive/geeknews'), { recursive: true });
    await writeFile(join(vault, '04_Action/note.md'), '# note', 'utf-8');
    await writeFile(join(vault, 'root-doc.md'), '# root', 'utf-8');
    await writeFile(
      join(vault, '99_Archive/geeknews/gn-1.md'),
      '# archived',
      'utf-8',
    );
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  it('서고 하위 md 만 반환하고 레이어·루트 문서는 담지 않는다', async () => {
    const files = await scanArchive(vault);
    expect(files.map((f) => f.relativePath)).toEqual([
      '99_Archive/geeknews/gn-1.md',
    ]);
  });

  it('scanVault 는 여전히 서고를 스캔하지 않는다', async () => {
    const files = await scanVault(vault);
    expect(files.map((f) => f.relativePath)).toEqual(['04_Action/note.md']);
  });
});
