/** @file readCachedNodesArray.test.ts 훅 동기 읽기의 저장 세대 게이트. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readCachedNodesArray } from '../readCachedNodesArray.js';

describe('readCachedNodesArray generations', () => {
  let vault: string;
  let cache: string;
  beforeEach(() => {
    vault = mkdtempSync(join(tmpdir(), 'maencof-node-generation-'));
    cache = join(vault, '.maencof');
    mkdirSync(join(cache, 'generations', 'selected'), { recursive: true });
    writeFileSync(
      join(cache, 'graph-meta.json'),
      JSON.stringify({ schemaVersion: 3, generation: 'selected' }),
    );
    writeFileSync(
      join(cache, 'generations', 'selected', 'nodes.json'),
      JSON.stringify({
        generation: 'selected',
        data: [{ title: 'committed' }],
      }),
    );
  });
  afterEach(() => {
    rmSync(vault, { recursive: true, force: true });
  });

  it('reads the selected generation instead of root-level stale nodes', () => {
    writeFileSync(
      join(cache, 'nodes.json'),
      JSON.stringify([{ title: 'stale' }]),
    );
    expect(readCachedNodesArray(vault)).toEqual([{ title: 'committed' }]);
  });

  it('rejects a shard from another generation', () => {
    writeFileSync(
      join(cache, 'nodes.json'),
      JSON.stringify([{ title: 'stale fallback' }]),
    );
    writeFileSync(
      join(cache, 'generations', 'selected', 'nodes.json'),
      JSON.stringify({ generation: 'other', data: [{ title: 'mixed' }] }),
    );
    expect(readCachedNodesArray(vault)).toEqual([]);
  });

  it('treats a legacy index as absent without creating a marker', () => {
    rmSync(join(cache, 'graph-meta.json'));
    writeFileSync(
      join(cache, 'index.json'),
      JSON.stringify({ nodes: [{ title: 'legacy' }] }),
    );
    expect(readCachedNodesArray(vault)).toEqual([]);
  });
});
