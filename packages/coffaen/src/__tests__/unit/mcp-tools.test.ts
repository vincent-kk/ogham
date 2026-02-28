/**
 * @file mcp-tools.test.ts
 * @description MCP 도구 핸들러 유닛 테스트
 *
 * 테스트 대상:
 * - shared.ts: appendStaleNode, removeBacklinks, getBacklinks, toolResult, toolError
 * - coffaen-create.ts: handleCoffaenCreate
 * - coffaen-delete.ts: handleCoffaenDelete (Layer 1 보호, backlink 경고)
 * - kg-status.ts: handleKgStatus
 * - kg-navigate.ts: handleKgNavigate
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  appendStaleNode,
  getBacklinks,
  mapReplacer,
  removeBacklinks,
  toolError,
  toolResult,
} from '../../mcp/shared.js';
import { handleCoffaenCreate } from '../../mcp/tools/coffaen-create.js';
import { handleCoffaenDelete } from '../../mcp/tools/coffaen-delete.js';
import { handleKgNavigate } from '../../mcp/tools/kg-navigate.js';
import { handleKgStatus } from '../../mcp/tools/kg-status.js';
import { toNodeId } from '../../types/common.js';
import { Layer } from '../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'coffaen-test-'));
}

async function removeTempVault(vaultPath: string): Promise<void> {
  await rm(vaultPath, { recursive: true, force: true });
}

function makeNode(id: string, layer: number = 2): KnowledgeNode {
  return {
    id: toNodeId(id),
    path: id,
    title: id,
    layer: layer as 1 | 2 | 3 | 4,
    tags: ['test'],
    created: '2024-01-01',
    updated: '2024-01-01',
    links: [],
    pagerank: 0.15,
    accessedCount: 0,
  };
}

function makeGraph(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[] = [],
): KnowledgeGraph {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return {
    nodes: nodeMap,
    edges,
    builtAt: new Date().toISOString(),
    nodeCount: nodes.size ?? nodes.length,
    edgeCount: edges.length,
  };
}

// ─── shared.ts ────────────────────────────────────────────────────────────────

describe('shared.ts', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
  });

  afterEach(async () => {
    await removeTempVault(vault);
  });

  describe('appendStaleNode', () => {
    it('stale-nodes.json이 없을 때 새로 생성한다', async () => {
      await appendStaleNode(vault, '01_Core/test.md');
      const raw = await readFile(
        join(vault, '.coffaen/stale-nodes.json'),
        'utf-8',
      );
      const data = JSON.parse(raw) as { paths: string[]; updatedAt: string };
      expect(data.paths).toContain('01_Core/test.md');
      expect(data.updatedAt).toBeTruthy();
    });

    it('기존 stale-nodes.json에 경로를 추가한다', async () => {
      await appendStaleNode(vault, '01_Core/first.md');
      await appendStaleNode(vault, '02_Derived/second.md');
      const raw = await readFile(
        join(vault, '.coffaen/stale-nodes.json'),
        'utf-8',
      );
      const data = JSON.parse(raw) as { paths: string[] };
      expect(data.paths).toContain('01_Core/first.md');
      expect(data.paths).toContain('02_Derived/second.md');
    });

    it('중복 경로를 추가하지 않는다', async () => {
      await appendStaleNode(vault, '01_Core/test.md');
      await appendStaleNode(vault, '01_Core/test.md');
      const raw = await readFile(
        join(vault, '.coffaen/stale-nodes.json'),
        'utf-8',
      );
      const data = JSON.parse(raw) as { paths: string[] };
      expect(data.paths.filter((p) => p === '01_Core/test.md')).toHaveLength(1);
    });
  });

  describe('getBacklinks / removeBacklinks', () => {
    it('backlink-index.json이 없을 때 빈 배열을 반환한다', async () => {
      const result = await getBacklinks(vault, '01_Core/target.md');
      expect(result).toEqual([]);
    });

    it('backlink-index.json에서 대상 파일의 backlink를 반환한다', async () => {
      const metaDir = join(vault, '.coffaen-meta');
      await mkdir(metaDir, { recursive: true });
      const index = {
        '01_Core/target.md': ['02_Derived/source.md', '03_External/ref.md'],
      };
      await writeFile(
        join(metaDir, 'backlink-index.json'),
        JSON.stringify(index),
        'utf-8',
      );

      const result = await getBacklinks(vault, '01_Core/target.md');
      expect(result).toEqual(['02_Derived/source.md', '03_External/ref.md']);
    });

    it('removeBacklinks가 소스 경로의 출처 항목을 제거한다', async () => {
      const metaDir = join(vault, '.coffaen-meta');
      await mkdir(metaDir, { recursive: true });
      const index = {
        '01_Core/target.md': ['02_Derived/source.md', '03_External/ref.md'],
        '01_Core/other.md': ['02_Derived/source.md'],
      };
      await writeFile(
        join(metaDir, 'backlink-index.json'),
        JSON.stringify(index),
        'utf-8',
      );

      await removeBacklinks(vault, '02_Derived/source.md');

      const raw = await readFile(join(metaDir, 'backlink-index.json'), 'utf-8');
      const updated = JSON.parse(raw) as Record<string, string[]>;
      expect(updated['01_Core/target.md']).toEqual(['03_External/ref.md']);
      expect(updated['01_Core/other.md']).toBeUndefined(); // 빈 배열 → 키 삭제
    });
  });

  describe('toolResult / toolError', () => {
    it('toolResult가 MCP content 포맷을 반환한다', () => {
      const result = toolResult({ success: true, path: 'test.md' });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text) as { success: boolean };
      expect(parsed.success).toBe(true);
    });

    it('toolError가 isError=true를 포함한 MCP content 포맷을 반환한다', () => {
      const result = toolError(new Error('테스트 에러'));
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('테스트 에러');
    });

    it('toolError가 Error가 아닌 값도 처리한다', () => {
      const result = toolError('string error');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('mapReplacer가 Map을 일반 객체로 변환한다', () => {
      const map = new Map([['key', 'value']]);
      const result = mapReplacer('', map);
      expect(result).toEqual({ key: 'value' });
    });

    it('mapReplacer가 Set을 배열로 변환한다', () => {
      const set = new Set([1, 2, 3]);
      const result = mapReplacer('', set);
      expect(result).toEqual([1, 2, 3]);
    });
  });
});

// ─── coffaen_create ──────────────────────────────────────────────────────────

describe('handleCoffaenCreate', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
  });

  afterEach(async () => {
    await removeTempVault(vault);
  });

  it('Layer 2 문서를 02_Derived 디렉토리에 생성한다', async () => {
    const result = await handleCoffaenCreate(vault, {
      layer: 2,
      tags: ['test', 'vitest'],
      content: '테스트 내용입니다.',
      title: 'Test Note',
    });

    expect(result.success).toBe(true);
    expect(result.path).toMatch(/^02_Derived\//);
    expect(result.path).toMatch(/\.md$/);
  });

  it('Layer 1 문서를 01_Core 디렉토리에 생성한다', async () => {
    const result = await handleCoffaenCreate(vault, {
      layer: 1,
      tags: ['identity'],
      content: '핵심 정체성 문서.',
      title: 'Core Identity',
    });

    expect(result.success).toBe(true);
    expect(result.path).toMatch(/^01_Core\//);
  });

  it('title이 없으면 tags[0]에서 파일명을 생성한다', async () => {
    const result = await handleCoffaenCreate(vault, {
      layer: 3,
      tags: ['external-source'],
      content: '외부 자료.',
    });

    expect(result.success).toBe(true);
    expect(result.path).toContain('external-source');
  });

  it('커스텀 filename 힌트를 사용한다', async () => {
    const result = await handleCoffaenCreate(vault, {
      layer: 2,
      tags: ['test'],
      content: '내용.',
      filename: 'my-custom-file',
    });

    expect(result.success).toBe(true);
    expect(result.path).toContain('my-custom-file');
  });

  it('생성된 파일에 Frontmatter가 포함된다', async () => {
    await handleCoffaenCreate(vault, {
      layer: 2,
      tags: ['alpha', 'beta'],
      content: '본문 내용.',
      title: 'FM Test',
    });

    const files = await import('node:fs/promises').then((m) =>
      m.readdir(join(vault, '02_Derived')),
    );
    expect(files.length).toBeGreaterThan(0);

    const content = await readFile(
      join(vault, '02_Derived', files[0]),
      'utf-8',
    );
    expect(content).toContain('---');
    expect(content).toContain('tags:');
    expect(content).toContain('layer: 2');
    expect(content).toContain('created:');
    expect(content).toContain('updated:');
  });

  it('동일 경로에 파일이 존재하면 실패를 반환한다', async () => {
    const input = {
      layer: 2 as const,
      tags: ['dup'],
      content: '첫 번째.',
      filename: 'duplicate',
    };

    const first = await handleCoffaenCreate(vault, input);
    expect(first.success).toBe(true);

    const second = await handleCoffaenCreate(vault, input);
    expect(second.success).toBe(false);
    expect(second.message).toContain('이미 존재합니다');
  });

  it('stale-nodes.json에 새 경로가 추가된다', async () => {
    await handleCoffaenCreate(vault, {
      layer: 2,
      tags: ['stale-test'],
      content: '내용.',
      title: 'Stale Test',
    });

    const raw = await readFile(
      join(vault, '.coffaen/stale-nodes.json'),
      'utf-8',
    );
    const data = JSON.parse(raw) as { paths: string[] };
    expect(data.paths.some((p) => p.startsWith('02_Derived/'))).toBe(true);
  });

  it('source와 expires 옵션 필드가 Frontmatter에 포함된다', async () => {
    await handleCoffaenCreate(vault, {
      layer: 3,
      tags: ['ext'],
      content: '외부 자료.',
      title: 'External',
      source: 'https://example.com',
      expires: '2025-12-31',
    });

    const files = await import('node:fs/promises').then((m) =>
      m.readdir(join(vault, '03_External')),
    );
    const content = await readFile(
      join(vault, '03_External', files[0]),
      'utf-8',
    );
    expect(content).toContain('source: https://example.com');
    expect(content).toContain('expires: 2025-12-31');
  });
});

// ─── coffaen_delete ──────────────────────────────────────────────────────────

describe('handleCoffaenDelete', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
  });

  afterEach(async () => {
    await removeTempVault(vault);
  });

  async function createTestFile(
    relativePath: string,
    layer: number = 2,
  ): Promise<void> {
    const absPath = join(vault, relativePath);
    await mkdir(join(vault, relativePath.split('/')[0]), { recursive: true });
    const content = `---\ncreated: 2024-01-01\nupdated: 2024-01-01\ntags: [test]\nlayer: ${layer}\n---\n\n테스트 문서.`;
    await writeFile(absPath, content, 'utf-8');
  }

  it('존재하지 않는 파일은 실패를 반환한다', async () => {
    const result = await handleCoffaenDelete(vault, { path: 'nonexistent.md' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('찾을 수 없습니다');
  });

  it('Layer 1 문서 삭제는 금지된다', async () => {
    await createTestFile('01_Core/identity.md', 1);
    const result = await handleCoffaenDelete(vault, {
      path: '01_Core/identity.md',
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('Layer 1');
  });

  it('backlink가 있으면 force=false 시 삭제를 거부한다', async () => {
    await createTestFile('02_Derived/target.md', 2);

    const metaDir = join(vault, '.coffaen-meta');
    await mkdir(metaDir, { recursive: true });
    const index = { '02_Derived/target.md': ['02_Derived/source.md'] };
    await writeFile(
      join(metaDir, 'backlink-index.json'),
      JSON.stringify(index),
      'utf-8',
    );

    const result = await handleCoffaenDelete(vault, {
      path: '02_Derived/target.md',
      force: false,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('force=true');
  });

  it('force=true이면 backlink가 있어도 삭제한다', async () => {
    await createTestFile('02_Derived/target.md', 2);

    const metaDir = join(vault, '.coffaen-meta');
    await mkdir(metaDir, { recursive: true });
    const index = { '02_Derived/target.md': ['02_Derived/source.md'] };
    await writeFile(
      join(metaDir, 'backlink-index.json'),
      JSON.stringify(index),
      'utf-8',
    );

    const result = await handleCoffaenDelete(vault, {
      path: '02_Derived/target.md',
      force: true,
    });

    expect(result.success).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings![0]).toContain('backlink');
  });

  it('삭제 성공 시 stale-nodes에 경로가 추가된다', async () => {
    await createTestFile('02_Derived/to-delete.md', 2);
    await handleCoffaenDelete(vault, { path: '02_Derived/to-delete.md' });

    const raw = await readFile(
      join(vault, '.coffaen/stale-nodes.json'),
      'utf-8',
    );
    const data = JSON.parse(raw) as { paths: string[] };
    expect(data.paths).toContain('02_Derived/to-delete.md');
  });

  it('Layer 2 문서가 backlink 없이 정상 삭제된다', async () => {
    await createTestFile('02_Derived/simple.md', 2);
    const result = await handleCoffaenDelete(vault, {
      path: '02_Derived/simple.md',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('삭제되었습니다');
  });
});

// ─── kg_status ────────────────────────────────────────────────────────────────

describe('handleKgStatus', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
  });

  afterEach(async () => {
    await removeTempVault(vault);
  });

  it('graph가 null이면 rebuildRecommended=true를 반환한다', async () => {
    const result = await handleKgStatus(vault, null, {});
    expect(result.nodeCount).toBe(0);
    expect(result.edgeCount).toBe(0);
    expect(result.rebuildRecommended).toBe(true);
    expect(result.freshnessPercent).toBe(0);
  });

  it('정상 그래프에서 freshness를 계산한다', async () => {
    const nodes = [makeNode('a.md'), makeNode('b.md'), makeNode('c.md')];
    const graph = makeGraph(nodes);

    const result = await handleKgStatus(vault, graph, {});
    expect(result.nodeCount).toBe(3);
    expect(result.edgeCount).toBe(0);
    expect(result.freshnessPercent).toBe(100); // stale 없음
    expect(result.rebuildRecommended).toBe(false);
  });

  it('stale-nodes가 있으면 freshnessPercent가 감소한다', async () => {
    const nodes = [
      makeNode('a.md'),
      makeNode('b.md'),
      makeNode('c.md'),
      makeNode('d.md'),
      makeNode('e.md'),
      makeNode('f.md'),
      makeNode('g.md'),
      makeNode('h.md'),
      makeNode('i.md'),
      makeNode('j.md'),
    ];
    const graph = makeGraph(nodes);

    // 노드 10개 중 2개 stale → 80%
    const cacheDir = join(vault, '.coffaen');
    await mkdir(cacheDir, { recursive: true });
    await writeFile(
      join(cacheDir, 'stale-nodes.json'),
      JSON.stringify({
        paths: ['a.md', 'b.md'],
        updatedAt: new Date().toISOString(),
      }),
      'utf-8',
    );

    const result = await handleKgStatus(vault, graph, {});
    expect(result.staleNodeCount).toBe(2);
    expect(result.freshnessPercent).toBe(80);
    expect(result.rebuildRecommended).toBe(true); // 2/10 = 20% > 10% 임계값
  });

  it('stale 비율이 10% 초과이면 rebuildRecommended=true', async () => {
    const nodes = Array.from({ length: 10 }, (_, i) =>
      makeNode(`node-${i}.md`),
    );
    const graph = makeGraph(nodes);

    const cacheDir = join(vault, '.coffaen');
    await mkdir(cacheDir, { recursive: true });
    await writeFile(
      join(cacheDir, 'stale-nodes.json'),
      JSON.stringify({
        paths: ['node-0.md', 'node-1.md'],
        updatedAt: new Date().toISOString(),
      }),
      'utf-8',
    );

    const result = await handleKgStatus(vault, graph, {});
    expect(result.rebuildRecommended).toBe(true);
  });

  it('vaultPath를 결과에 포함한다', async () => {
    const result = await handleKgStatus(vault, null, {});
    expect(result.vaultPath).toBe(vault);
  });
});

// ─── kg_navigate ─────────────────────────────────────────────────────────────

describe('handleKgNavigate', () => {
  it('graph가 null이면 error를 반환한다', async () => {
    const result = await handleKgNavigate(null, { path: 'test.md' });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('인덱스');
    }
  });

  it('존재하지 않는 노드이면 error를 반환한다', async () => {
    const graph = makeGraph([makeNode('a.md')]);
    const result = await handleKgNavigate(graph, { path: 'nonexistent.md' });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('찾을 수 없습니다');
    }
  });

  it('인바운드 LINK 엣지를 올바르게 반환한다', async () => {
    const nodeA = makeNode('a.md');
    const nodeB = makeNode('b.md');
    const edges: KnowledgeEdge[] = [
      { from: nodeA.id, to: nodeB.id, type: 'LINK', weight: 1.0 },
    ];
    const graph = makeGraph([nodeA, nodeB], edges);

    const result = await handleKgNavigate(graph, { path: 'b.md' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.inbound).toHaveLength(1);
      expect(result.inbound[0].path).toBe('a.md');
      expect(result.outbound).toHaveLength(0);
    }
  });

  it('아웃바운드 LINK 엣지를 올바르게 반환한다', async () => {
    const nodeA = makeNode('a.md');
    const nodeB = makeNode('b.md');
    const edges: KnowledgeEdge[] = [
      { from: nodeA.id, to: nodeB.id, type: 'LINK', weight: 1.0 },
    ];
    const graph = makeGraph([nodeA, nodeB], edges);

    const result = await handleKgNavigate(graph, { path: 'a.md' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.outbound).toHaveLength(1);
      expect(result.outbound[0].path).toBe('b.md');
      expect(result.inbound).toHaveLength(0);
    }
  });

  it('PARENT_OF 엣지로 parent/children을 반환한다', async () => {
    const parent = makeNode('parent.md');
    const child = makeNode('child.md');
    const edges: KnowledgeEdge[] = [
      { from: parent.id, to: child.id, type: 'PARENT_OF', weight: 1.0 },
    ];
    const graph = makeGraph([parent, child], edges);

    const parentResult = await handleKgNavigate(graph, { path: 'parent.md' });
    const childResult = await handleKgNavigate(graph, { path: 'child.md' });

    expect('error' in parentResult).toBe(false);
    expect('error' in childResult).toBe(false);

    if (!('error' in parentResult)) {
      expect(parentResult.children).toHaveLength(1);
      expect(parentResult.children[0].path).toBe('child.md');
      expect(parentResult.parent).toBeUndefined();
    }

    if (!('error' in childResult)) {
      expect(childResult.parent?.path).toBe('parent.md');
      expect(childResult.children).toHaveLength(0);
    }
  });

  it('SIBLING 엣지로 siblings를 반환한다', async () => {
    const nodeA = makeNode('a.md');
    const nodeB = makeNode('b.md');
    const edges: KnowledgeEdge[] = [
      { from: nodeA.id, to: nodeB.id, type: 'SIBLING', weight: 0.5 },
    ];
    const graph = makeGraph([nodeA, nodeB], edges);

    const result = await handleKgNavigate(graph, { path: 'a.md' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.siblings).toHaveLength(1);
      expect(result.siblings[0].path).toBe('b.md');
    }
  });

  it('include_inbound=false이면 인바운드 링크를 제외한다', async () => {
    const nodeA = makeNode('a.md');
    const nodeB = makeNode('b.md');
    const edges: KnowledgeEdge[] = [
      { from: nodeA.id, to: nodeB.id, type: 'LINK', weight: 1.0 },
    ];
    const graph = makeGraph([nodeA, nodeB], edges);

    const result = await handleKgNavigate(graph, {
      path: 'b.md',
      include_inbound: false,
    });

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.inbound).toHaveLength(0);
    }
  });

  it('include_hierarchy=false이면 parent/children/siblings를 제외한다', async () => {
    const parent = makeNode('parent.md');
    const child = makeNode('child.md');
    const edges: KnowledgeEdge[] = [
      { from: parent.id, to: child.id, type: 'PARENT_OF', weight: 1.0 },
    ];
    const graph = makeGraph([parent, child], edges);

    const result = await handleKgNavigate(graph, {
      path: 'child.md',
      include_hierarchy: false,
    });

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.parent).toBeUndefined();
      expect(result.children).toHaveLength(0);
    }
  });

  it('노드 자기 자신을 node 필드로 반환한다', async () => {
    const node = makeNode('target.md');
    const graph = makeGraph([node]);

    const result = await handleKgNavigate(graph, { path: 'target.md' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.node.path).toBe('target.md');
    }
  });
});
