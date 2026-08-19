/**
 * @file frontmatterClusterKey.test.ts
 * @description cluster_key frontmatter 필드 (R3) — 스키마 보존, 노드 전파, 직렬화 왕복,
 * create/update 노출, unset 제거. 시드·태그 채널과 분리된 스레드 선언 필드.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../../core/documentParser/index.js';
import {
  deserializeGraph,
  serializeGraph,
} from '../../../core/indexer/metadataStore/index.js';
import { handleMaencofCreate } from '../../../mcp/tools/maencofCreate/maencofCreate.js';
import { handleMaencofUpdate } from '../../../mcp/tools/maencofUpdate/maencofUpdate.js';
import type { NodeId } from '../../../types/common.js';
import { validateFrontmatter } from '../../../types/frontmatter.js';
import type { KnowledgeGraph } from '../../../types/graph.js';

const FM_WITH_CLUSTER = {
  created: '2026-08-19',
  updated: '2026-08-19',
  tags: ['jira'],
  layer: 4,
  cluster_key: 'jira-gcc-3903',
};

describe('cluster_key 스키마', () => {
  it('validateFrontmatter 가 cluster_key 를 보존한다', () => {
    const result = validateFrontmatter(FM_WITH_CLUSTER);

    expect(result.ok).toBe(true);
    expect(result.ok && result.data.cluster_key).toBe('jira-gcc-3903');
  });

  it('빈 문자열 cluster_key 는 거부한다 (min 1)', () => {
    const result = validateFrontmatter({ ...FM_WITH_CLUSTER, cluster_key: '' });

    expect(result.ok).toBe(false);
  });
});

describe('cluster_key 노드 전파·직렬화', () => {
  const DOC = [
    '---',
    'created: 2026-08-19',
    'updated: 2026-08-19',
    'tags: [jira]',
    'layer: 4',
    'cluster_key: jira-gcc-3903',
    '---',
    '# Thread update',
  ].join('\n');

  it('buildKnowledgeNode 가 clusterKey 로 전파한다', () => {
    const doc = parseDocument('04_Action/2026/gcc-3903-01.md', DOC, 1000);
    const result = buildKnowledgeNode(doc);

    expect(result.success).toBe(true);
    expect(result.node?.clusterKey).toBe('jira-gcc-3903');
  });

  it('serialize→deserialize 왕복에서 clusterKey 가 보존된다', () => {
    const doc = parseDocument('04_Action/2026/gcc-3903-01.md', DOC, 1000);
    const node = buildKnowledgeNode(doc).node!;
    const graph: KnowledgeGraph = {
      nodes: new Map([[node.id, node]]),
      edges: [],
      builtAt: 't',
      nodeCount: 1,
      edgeCount: 0,
    };

    const restored = deserializeGraph(serializeGraph(graph));

    expect(
      restored.nodes.get('04_Action/2026/gcc-3903-01.md' as NodeId)?.clusterKey,
    ).toBe('jira-gcc-3903');
  });
});

describe('cluster_key create/update 노출', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await mkdtemp(join(tmpdir(), 'maencof-cluster-key-'));
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  async function writeThreadDoc(rel: string): Promise<void> {
    const abs = join(vault, rel);
    await mkdir(join(vault, rel.split('/').slice(0, -1).join('/')), {
      recursive: true,
    });
    const content = [
      '---',
      'created: 2026-08-19',
      'updated: 2026-08-19',
      'tags: [jira]',
      'layer: 4',
      '---',
      '',
      'Body.',
    ].join('\n');
    await writeFile(abs, content, 'utf-8');
  }

  it('create 가 cluster_key 라인을 frontmatter 에 기록한다', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: 4,
      tags: ['jira'],
      content: 'Thread update body.',
      title: 'GCC-3903 update',
      cluster_key: 'jira-gcc-3903',
    });

    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, result.path), 'utf-8');
    expect(raw).toContain('cluster_key: jira-gcc-3903');
  });

  it('update 가 cluster_key 를 패치하고 unset 으로 제거한다', async () => {
    await writeThreadDoc('04_Action/2026/thread.md');

    const patched = await handleMaencofUpdate(vault, {
      path: '04_Action/2026/thread.md',
      frontmatter: { cluster_key: 'works-mail-2026-08-19' },
    });
    expect(patched.success).toBe(true);
    const afterPatch = await readFile(
      join(vault, '04_Action/2026/thread.md'),
      'utf-8',
    );
    expect(afterPatch).toContain('cluster_key: works-mail-2026-08-19');

    const removed = await handleMaencofUpdate(vault, {
      path: '04_Action/2026/thread.md',
      frontmatter: { unset: ['cluster_key'] },
    });
    expect(removed.success).toBe(true);
    const afterUnset = await readFile(
      join(vault, '04_Action/2026/thread.md'),
      'utf-8',
    );
    expect(afterUnset).not.toContain('cluster_key');
  });
});
