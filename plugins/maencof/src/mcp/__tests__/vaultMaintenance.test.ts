import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, it } from 'vitest';

import { MetadataStore } from '../../core/indexer/index.js';
import type { Layer, NodeId } from '../../types/common.js';
import {
  handleKgBuild,
  handleKgInventory,
  handleMaencofCreate,
  handleMaencofMove,
  handleMaencofRead,
  handleMaencofUpdate,
} from '../tools/index.js';

const scenario = JSON.parse(
  readFileSync(
    new URL('./fixtures/vaultMaintenance/scenario.json', import.meta.url),
    'utf8',
  ),
) as {
  documents: Array<{
    path: string;
    title: string;
    tags: string[];
    body: string;
  }>;
  repeatedReferences: number;
  reviewedMoves: Record<string, string>;
};
let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'vault-maintenance-'));
  for (const doc of scenario.documents) {
    const result = await handleMaencofCreate(root, {
      layer: Number(doc.path.slice(0, 2)) as Layer,
      filename: doc.path.split('/').slice(1).join('/'),
      title: doc.title,
      tags: doc.tags,
      content: doc.body,
      gist: doc.title,
      source: 'https://example.test/original#scope',
    });
    expect(result.success).toBe(true);
  }
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it('can recover an earlier successful move after a later collision and retain protection warnings', async () => {
  const original = await handleMaencofRead(root, {
    path: '02_Derived/pg-locks.md',
  });
  const moved = await handleMaencofMove(root, {
    path: original.path,
    target_layer: 2,
    target_subdirectory: 'databases/postgresql',
  });
  expect(moved.success).toBe(true);
  expect(
    (
      await handleMaencofMove(root, {
        path: '02_Derived/a/note.md',
        target_layer: 2,
        target_subdirectory: 'z',
      })
    ).success,
  ).toBe(false);
  const recovery = await handleMaencofMove(root, {
    path: moved.path,
    target_layer: 2,
    target_subdirectory: '',
  });
  expect(recovery.path).toBe(original.path);
  expect((await handleMaencofRead(root, { path: recovery.path })).content).toBe(
    original.content,
  );
  const amended = await handleMaencofUpdate(root, {
    path: '01_Core/identity.md',
    content: 'x'.repeat(6001),
    confirm_l1: true,
    change_reason: 'info_update',
    justification: 'Synthetic fixture tests warning composition only.',
  });
  expect(amended.success).toBe(true);
  expect(
    amended.warnings?.some((warning) =>
      warning.includes('document_size_exceeded'),
    ),
  ).toBe(true);
  expect(
    amended.warnings?.some((warning) => warning.includes('L1 amendment')),
  ).toBe(true);
  const read = await handleMaencofRead(root, { path: '01_Core/identity.md' });
  expect(
    read.warnings?.some((warning) =>
      warning.includes('document_size_exceeded'),
    ),
  ).toBe(true);
  expect(
    read.warnings?.some((warning) => warning.includes('indirect access')),
  ).toBe(true);
});

/** Exhaust disk pages, never a relevance-ranked or capped graph neighborhood. */
async function paths() {
  const result: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await handleKgInventory(root, { cursor, limit: 200 });
    if ('error' in page) throw new Error(page.error);
    result.push(...page.items.map((item) => item.path));
    cursor = page.next_cursor;
  } while (cursor);
  return result;
}

it('repairs more than 200 scope-external references with stale graph and preserves targets', async () => {
  expect((await handleKgBuild(root, {})).success).toBe(true);
  for (let i = 0; i < scenario.repeatedReferences; i++) {
    await handleMaencofCreate(root, {
      layer: 4,
      tags: ['review'],
      filename: `ref-${i}`,
      content: '[Locks](../02_Derived/pg-locks.md#Scope)',
    });
  }
  const all = await paths();
  expect(all).toHaveLength(
    scenario.documents.length + scenario.repeatedReferences,
  );
  const before = await handleMaencofRead(root, {
    path: '02_Derived/pg-locks.md',
  });
  for (const old of Object.keys(scenario.reviewedMoves)) {
    expect(
      (
        await handleMaencofMove(root, {
          path: old,
          target_layer: 2,
          target_subdirectory: 'databases/postgresql',
        })
      ).path,
    ).toBe(scenario.reviewedMoves[old]);
  }
  for (const source of all.filter((path) =>
    path.startsWith('04_Action/ref-'),
  )) {
    const current = await handleMaencofRead(root, { path: source });
    const body = current.content.slice(current.content.indexOf('---', 3) + 4);
    expect(
      (
        await handleMaencofUpdate(root, {
          path: source,
          content: body.replace(
            '../02_Derived/pg-locks.md#Scope',
            '../02_Derived/databases/postgresql/pg-locks.md#Scope',
          ),
        })
      ).success,
    ).toBe(true);
  }
  const moved = await handleMaencofRead(root, {
    path: scenario.reviewedMoves['02_Derived/pg-locks.md'],
  });
  expect(moved.node.tags).toEqual(before.node.tags);
  expect(moved.node.created).toBe(before.node.created);
  expect(moved.content).toContain('https://example.test/original#scope');
  expect(moved.content).toContain('[Timeout](./pg-timeouts.md#Scope)');
  expect(moved.content).toContain('With concurrent writers');
  expect((await handleKgBuild(root, {})).success).toBe(true);
  const graph = await new MetadataStore(root).loadGraph();
  for (const source of all.filter((path) =>
    path.startsWith('04_Action/ref-'),
  )) {
    expect((await handleMaencofRead(root, { path: source })).content).toContain(
      'pg-locks.md#Scope',
    );
    expect(graph?.nodes.get(source as NodeId)?.outboundLinks).toContain(
      scenario.reviewedMoves['02_Derived/pg-locks.md'],
    );
  }
  expect(
    graph?.nodes.get('04_Action/review.md' as NodeId)?.outboundLinks,
  ).toContain(scenario.reviewedMoves['02_Derived/pg-locks.md']);
  expect(
    (await handleMaencofRead(root, { path: '04_Action/review.md' })).content,
  ).toContain('[[pg-locks#Scope|Lock guide]]');
});

it('preserves a complete original through child creation, then rewrites without appended corrections', async () => {
  const path = '02_Derived/pg-timeouts.md';
  const current = await handleMaencofRead(root, { path });
  const rewritten =
    '# PostgreSQL timeouts\n\n## Scope\nFor this project, the configured timeout is 20 seconds.\n';
  expect(
    (await handleMaencofUpdate(root, { path, content: rewritten })).success,
  ).toBe(true);
  const updated = await handleMaencofRead(root, { path });
  expect(updated.content).not.toContain('30 seconds');
  expect(updated.content.length).toBeLessThanOrEqual(current.content.length);
  const mixed = await handleMaencofRead(root, { path: '02_Derived/mixed.md' });
  const child = await handleMaencofCreate(root, {
    layer: 2,
    tags: ['kitchen'],
    filename: 'cooking/recipe',
    content:
      '# Recipe\n\nTwo eggs. [Source](https://example.test/original#scope).',
  });
  expect(child.success).toBe(true);
  expect(
    (await handleMaencofRead(root, { path: '02_Derived/mixed.md' })).content,
  ).toBe(mixed.content);
  expect(
    (await handleMaencofRead(root, { path: child.path })).content,
  ).toContain('original#scope');
  await handleMaencofUpdate(root, {
    path: '02_Derived/mixed.md',
    content:
      '# Project and kitchen\n\n## Project\nThe local project uses PostgreSQL.\n\n## Kitchen\n[Recipe](./cooking/recipe.md)\n',
  });
  expect(
    (await handleMaencofRead(root, { path: '02_Derived/mixed.md' })).content,
  ).toContain('## Kitchen');
  expect(
    (
      await handleMaencofCreate(root, {
        layer: 2,
        tags: ['kitchen'],
        filename: 'cooking/recipe',
        content: 'duplicate',
      })
    ).success,
  ).toBe(false);
});

it('detects new references between preview pages, rejects protected edits and preserves collision sources', async () => {
  const first = await handleKgInventory(root, { limit: 1 });
  if ('error' in first) throw new Error(first.error);
  await handleMaencofCreate(root, {
    layer: 4,
    tags: ['new'],
    filename: 'new-reference',
    content: '[[pg-locks]]',
  });
  expect(
    await handleKgInventory(root, { cursor: first.next_cursor }),
  ).toHaveProperty('error', 'inventory_changed');
  expect(
    (
      await handleMaencofUpdate(root, {
        path: '01_Core/identity.md',
        content: 'unauthorized repair',
      })
    ).success,
  ).toBe(false);
  const original = await handleMaencofRead(root, {
    path: '02_Derived/a/note.md',
  });
  expect(
    (
      await handleMaencofMove(root, {
        path: original.path,
        target_layer: 2,
        target_subdirectory: 'z',
      })
    ).success,
  ).toBe(false);
  expect((await handleMaencofRead(root, { path: original.path })).content).toBe(
    original.content,
  );
  expect(
    (await handleMaencofRead(root, { path: '02_Derived/z/note.md' })).content,
  ).toContain('unrelated namesake');
});
