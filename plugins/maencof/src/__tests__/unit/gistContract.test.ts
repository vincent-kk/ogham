/**
 * @file gistContract.test.ts
 * @description gist authoring/indexing 라운드트립 — create/update 가 gist 를 쓰고,
 *   buildKnowledgeNode 가 gist 를 node 메타로 전파하는지 검증한다.
 */
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../core/documentParser/index.js';
import { handleMaencofCreate } from '../../mcp/tools/maencofCreate/maencofCreate.js';
import { handleMaencofMove } from '../../mcp/tools/maencofMove/maencofMove.js';
import { handleMaencofRead } from '../../mcp/tools/maencofRead/maencofRead.js';
import { handleMaencofUpdate } from '../../mcp/tools/maencofUpdate/maencofUpdate.js';

const L1_DOC = [
  '---',
  'created: 2024-01-01',
  'updated: 2024-01-01',
  'tags: [core]',
  'layer: 1',
  '---',
  '',
  'Original L1 body.',
].join('\n');

describe('gist authoring (create/update)', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await mkdtemp(join(tmpdir(), 'maencof-gist-'));
    await mkdir(join(vault, '01_Core'), { recursive: true });
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  it('create writes the gist line and it round-trips to node.gist', async () => {
    const created = await handleMaencofCreate(vault, {
      layer: 2,
      tags: ['ts'],
      content: 'body',
      title: 'with-gist',
      gist: 'compact one-line gist',
    });
    expect(created.success).toBe(true);

    const raw = await readFile(join(vault, created.path), 'utf-8');
    expect(raw).toContain('gist: compact one-line gist');

    const read = await handleMaencofRead(vault, { path: created.path });
    expect(read.node.gist).toBe('compact one-line gist');
  });

  it('create without gist leaves node.gist undefined', async () => {
    const created = await handleMaencofCreate(vault, {
      layer: 2,
      tags: ['ts'],
      content: 'body',
      title: 'no-gist',
    });
    const raw = await readFile(join(vault, created.path), 'utf-8');
    expect(raw).not.toContain('gist:');

    const read = await handleMaencofRead(vault, { path: created.path });
    expect(read.node.gist).toBeUndefined();
  });

  it('update adds a gist to an L1 document through the amendment gate', async () => {
    await writeFile(join(vault, '01_Core/identity.md'), L1_DOC, 'utf-8');
    const result = await handleMaencofUpdate(vault, {
      path: '01_Core/identity.md',
      frontmatter: { gist: 'definition-first, density-focused' },
      change_reason: 'info_update',
      justification: 'Add the required L1 gist for turn-context injection.',
      confirm_l1: true,
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, '01_Core/identity.md'), 'utf-8');
    expect(raw).toContain('gist: definition-first, density-focused');
    expect(raw).toContain('Original L1 body.');
  });

  it('content-only update preserves an existing gist line', async () => {
    const withGist = L1_DOC.replace('layer: 1\n', 'layer: 1\ngist: keep me\n');
    await writeFile(join(vault, '01_Core/identity.md'), withGist, 'utf-8');
    const result = await handleMaencofUpdate(vault, {
      path: '01_Core/identity.md',
      content: 'New L1 body.',
      change_reason: 'info_update',
      justification: 'Rewrite the L1 body without touching the gist field.',
      confirm_l1: true,
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, '01_Core/identity.md'), 'utf-8');
    expect(raw).toContain('gist: keep me');
    expect(raw).toContain('New L1 body.');
  });

  it('rejects an L1 create without a gist and writes no file (fail-safe)', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: 1,
      tags: ['core'],
      content: 'body',
      title: 'no-gist-l1',
      filename: 'no-gist-check',
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('gist');
    // Vault safety: a rejected create must not touch the vault.
    await expect(
      access(join(vault, '01_Core/no-gist-check.md')),
    ).rejects.toThrow();
  });

  it('rejects a gist-less L1 modification and leaves the file unchanged (fail-safe)', async () => {
    await writeFile(join(vault, '01_Core/identity.md'), L1_DOC, 'utf-8');
    const before = await readFile(join(vault, '01_Core/identity.md'), 'utf-8');
    const result = await handleMaencofUpdate(vault, {
      path: '01_Core/identity.md',
      content: 'New body without adding a gist.',
      change_reason: 'info_update',
      justification: 'Edit the legacy L1 body but forget to add a gist.',
      confirm_l1: true,
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('gist');
    // Vault safety: the rejected write leaves the document byte-for-byte intact.
    expect(await readFile(join(vault, '01_Core/identity.md'), 'utf-8')).toBe(
      before,
    );
  });

  it('rejects moving a gist-less document into Layer 1 and leaves it in place (fail-safe)', async () => {
    await mkdir(join(vault, '02_Derived'), { recursive: true });
    const src = '02_Derived/note.md';
    await writeFile(
      join(vault, src),
      '---\ncreated: 2024-01-01\nupdated: 2024-01-01\ntags: [note]\nlayer: 2\n---\nA note without a gist.',
      'utf-8',
    );
    const result = await handleMaencofMove(vault, {
      path: src,
      target_layer: 1,
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('gist');
    // Vault safety: the document stays at its original path, unmoved.
    expect(await readFile(join(vault, src), 'utf-8')).toContain('layer: 2');
    await expect(access(join(vault, '01_Core/note.md'))).rejects.toThrow();
  });

  it('rejects promoting a non-L1 document to Layer 1 without a gist (fail-safe)', async () => {
    await mkdir(join(vault, '02_Derived'), { recursive: true });
    const p = '02_Derived/promote.md';
    await writeFile(
      join(vault, p),
      '---\ncreated: 2024-01-01\nupdated: 2024-01-01\ntags: [note]\nlayer: 2\n---\nBody.',
      'utf-8',
    );
    const result = await handleMaencofUpdate(vault, {
      path: p,
      frontmatter: { layer: 1 },
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('gist');
    // Vault safety: the layer field is not flipped on rejection.
    expect(await readFile(join(vault, p), 'utf-8')).toContain('layer: 2');
  });
});

describe('buildKnowledgeNode — gist propagation', () => {
  it('propagates a frontmatter gist to node.gist', () => {
    const content = `---\ncreated: 2024-01-01\nupdated: 2024-01-01\ntags: [core]\nlayer: 1\ngist: propagated gist\n---\nbody`;
    const result = buildKnowledgeNode(
      parseDocument('01_Core/x.md', content, 0),
    );
    expect(result.success).toBe(true);
    expect(result.node?.gist).toBe('propagated gist');
  });

  it('leaves node.gist undefined when frontmatter has no gist', () => {
    const content = `---\ncreated: 2024-01-01\nupdated: 2024-01-01\ntags: [core]\nlayer: 1\n---\nbody`;
    const result = buildKnowledgeNode(
      parseDocument('01_Core/x.md', content, 0),
    );
    expect(result.success).toBe(true);
    expect(result.node?.gist).toBeUndefined();
  });
});
