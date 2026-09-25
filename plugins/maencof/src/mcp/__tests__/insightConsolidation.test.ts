import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, it } from 'vitest';

import type { Layer } from '../../types/common.js';
import {
  handleKgInventory,
  handleMaencofCreate,
  handleMaencofRead,
  handleMaencofUpdate,
} from '../tools/index.js';

/** Synthetic API evidence only; the test does not execute the organize skill. */
const scenario = JSON.parse(
  readFileSync(
    new URL('./fixtures/insightConsolidation/scenario.json', import.meta.url),
    'utf8',
  ),
) as {
  documents: Array<{
    filename: string;
    layer: Layer;
    title: string;
    tags: string[];
    body: string;
  }>;
};
let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'insight-consolidation-'));
  for (const doc of scenario.documents) {
    expect(
      (await handleMaencofCreate(root, { ...doc, content: doc.body })).success,
    ).toBe(true);
  }
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it('supports synthesis metadata and relation links without losing source bytes or provenance', async () => {
  const path = '02_Derived/controls.md';
  const before = await handleMaencofRead(root, { path });
  const target = await handleMaencofCreate(root, {
    layer: 2,
    filename: 'controls-account',
    title: 'Control mechanisms and roles',
    tags: ['controls', 'insight-synthesis'],
    gist: 'Evaluate obsolete mechanisms separately from necessary roles.',
    content:
      '## Applicability\nRemove the obsolete syntax-repair retry while retaining output validation.\n\n## Sources\n[Mechanism](./controls.md#Claim) and [role](./control-role.md#Claim).',
  });
  expect(target.success).toBe(true);
  expect((await handleMaencofRead(root, { path })).content).toBe(
    before.content,
  );
  const account = await handleMaencofRead(root, { path: target.path });
  expect(account.node.gist).toBe(
    'Evaluate obsolete mechanisms separately from necessary roles.',
  );
  expect(account.content).toContain('./control-role.md#Claim');
  expect(
    (
      await handleMaencofUpdate(root, {
        path,
        content:
          scenario.documents[0].body +
          '\n\n## Insight Integration\n[Current account](./controls-account.md#Applicability) — preserves the mechanism observation.',
        frontmatter: { tags: [...before.node.tags, 'insight-integrated'] },
      })
    ).success,
  ).toBe(true);
  const marked = await handleMaencofRead(root, { path });
  expect(marked.content).toContain(scenario.documents[0].body);
  expect(marked.node.created).toBe(before.node.created);
  expect(marked.node.tags).toEqual([
    'auto-insight',
    'controls',
    'insight-integrated',
  ]);
});

it('rejects a duplicate target path without replacing the existing account', async () => {
  const before = await handleMaencofRead(root, {
    path: '02_Derived/controls.md',
  });
  const result = await handleMaencofCreate(root, {
    layer: 2,
    filename: 'controls',
    tags: ['insight-synthesis'],
    content: 'Replacement without review',
  });
  expect(result.success).toBe(false);
  expect((await handleMaencofRead(root, { path: before.path })).content).toBe(
    before.content,
  );
});

it('enumerates all insight layers without a graph and rejects a stale page cursor', async () => {
  const paths: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await handleKgInventory(root, {
      layer_filter: [2, 5],
      limit: 2,
      cursor,
    });
    if ('error' in page) throw new Error(page.error);
    paths.push(...page.items.map((item) => item.path));
    cursor = page.next_cursor;
  } while (cursor);
  expect(paths).toHaveLength(scenario.documents.length);
  expect(paths).toContain('05_Context/control-hypothesis.md');
  const first = await handleKgInventory(root, { limit: 1 });
  if ('error' in first) throw new Error(first.error);
  await handleMaencofUpdate(root, {
    path: '02_Derived/controls.md',
    content: 'Concurrent new observation changes the reviewed source.',
  });
  expect(
    await handleKgInventory(root, { limit: 1, cursor: first.next_cursor }),
  ).toHaveProperty('error', 'inventory_changed');
});
