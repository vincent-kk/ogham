import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, it } from 'vitest';

import { handleKgInventory } from '../index.js';

let root: string;
const document =
  '---\nlayer: 2\ntags: [different]\ncreated: 2026-09-26\nupdated: 2026-09-26\n---\nEvidence';
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'inventory-'));
  await mkdir(join(root, '02_Derived'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it('enumerates every file across pages including malformed frontmatter without a graph', async () => {
  await Promise.all(
    Array.from({ length: 202 }, (_, i) =>
      writeFile(
        join(root, `02_Derived/${i}.md`),
        i === 0 ? 'broken' : document,
      ),
    ),
  );
  const first = await handleKgInventory(root, { limit: 200 });
  if ('error' in first) throw new Error(first.error);
  expect(first.total).toBe(202);
  expect(first.items).toHaveLength(200);
  expect(
    first.items.find((item) => item.path.endsWith('/0.md'))?.parse_error,
  ).toBeTruthy();
  const second = await handleKgInventory(root, {
    cursor: first.next_cursor,
    limit: 200,
  });
  if ('error' in second) throw new Error(second.error);
  expect(second.items).toHaveLength(2);
  expect(second.next_cursor).toBeUndefined();
  expect(
    first.items.some((a) => second.items.some((b) => a.path === b.path)),
  ).toBe(false);
});
it('rejects changed snapshots and changed cursor filters', async () => {
  await writeFile(join(root, '02_Derived/a.md'), document);
  await writeFile(join(root, '02_Derived/b.md'), document);
  const page = await handleKgInventory(root, { limit: 1 });
  if ('error' in page) throw new Error(page.error);
  expect(
    await handleKgInventory(root, {
      cursor: page.next_cursor,
      path_prefix: '02_Derived',
    }),
  ).toHaveProperty('error', 'inventory_changed');
  await writeFile(join(root, '02_Derived/a.md'), document + ' edited');
  expect(
    await handleKgInventory(root, { cursor: page.next_cursor }),
  ).toHaveProperty('error', 'inventory_changed');
});
it('enforces directory boundaries, layer filters and scan exclusions', async () => {
  await mkdir(join(root, '02_Derived/topic'));
  await mkdir(join(root, '02_Derived/topic-other'));
  await mkdir(join(root, '99_Archive'));
  await writeFile(join(root, '02_Derived/topic/a.md'), document);
  await writeFile(join(root, '02_Derived/topic-other/b.md'), document);
  await writeFile(join(root, '99_Archive/old.md'), document);
  await writeFile(join(root, 'root.md'), document);
  await symlink(join(root, 'root.md'), join(root, '02_Derived/link.md'));
  const page = await handleKgInventory(root, {
    path_prefix: '02_Derived/topic/',
    layer_filter: [2],
  });
  expect(page).toHaveProperty('total', 1);
  expect(await handleKgInventory(root, { layer_filter: [3] })).toHaveProperty(
    'total',
    0,
  );
  expect(await handleKgInventory(root, {})).toHaveProperty('total', 2);
});
it.each([
  { limit: 0 },
  { path_prefix: '/' },
  { limit: 201 },
  { path_prefix: '../escape' },
  { cursor: 'invalid' },
])('rejects invalid input %j', async (input) => {
  expect(await handleKgInventory(root, input)).toHaveProperty(
    'error',
    'invalid_inventory_input',
  );
});
