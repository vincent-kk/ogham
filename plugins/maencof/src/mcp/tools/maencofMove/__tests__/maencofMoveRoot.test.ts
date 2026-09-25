import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, it } from 'vitest';

import { handleMaencofMove } from '../index.js';

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'move-root-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});
it.each([
  { layer: 2 as const, dir: '02_Derived' },
  { layer: 4 as const, dir: '04_Action' },
  { layer: 3 as const, dir: '03_External/topical', sub: 'topical' as const },
])(
  'moves $dir back to root and retries without writing',
  async ({ layer, dir, sub }) => {
    await mkdir(join(root, dir, 'topic'), { recursive: true });
    const path = `${dir}/topic/note.md`;
    await writeFile(
      join(root, path),
      `---\nlayer: ${layer}\n${sub ? 'sub_layer: topical\n' : ''}tags: [test]\ncreated: 2026-09-26\nupdated: 2026-09-26\n---\nBody`,
    );
    if (!sub)
      expect(
        (await handleMaencofMove(root, { path, target_layer: layer })).success,
      ).toBe(false);
    const result = await handleMaencofMove(root, {
      path,
      target_layer: layer,
      target_sub_layer: sub,
      target_subdirectory: '',
    });
    expect(result.success).toBe(true);
    expect(result.path).toBe(`${dir}/note.md`);
    const before = await stat(join(root, result.path));
    expect(
      (
        await handleMaencofMove(root, {
          path: result.path,
          target_layer: layer,
          target_sub_layer: sub,
          target_subdirectory: '',
        })
      ).success,
    ).toBe(true);
    expect((await stat(join(root, result.path))).mtimeMs).toBe(before.mtimeMs);
    expect(await readFile(join(root, result.path), 'utf8')).toContain('Body');
  },
);
