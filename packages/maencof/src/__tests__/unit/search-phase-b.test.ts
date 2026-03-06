/**
 * @file search-phase-b.test.ts
 * @description Phase B 테스트: B3 (Variable Seed Scoring), B1 (Adaptive SA), B4-lite (Content Snippets), B6 (Directives)
 */
import { describe, expect, it } from 'vitest';

import { runSpreadingActivation } from '../../core/spreading-activation.js';
import { extractBestSnippet } from '../../search/context-assembler.js';
import {
  query,
  resolveSeedNodes,
} from '../../search/query-engine.js';
import type { ScoredSeed } from '../../search/query-engine.js';
import { Layer, toNodeId } from '../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';
import { buildAdjacencyList } from '../../core/graph-builder.js';

/** 테스트용 노드 생성 헬퍼 */
function makeNode(
  id: string,
  layer: Layer,
  overrides?: Partial<KnowledgeNode>,
): KnowledgeNode {
  return {
    id: toNodeId(id),
    path: id,
    title: overrides?.title ?? id,
    layer,
    tags: overrides?.tags ?? [],
    created: '2026-03-07',
    updated: '2026-03-07',
    mtime: 0,
    accessed_count: 0,
    ...overrides,
    id: toNodeId(id),
  };
}

/** 테스트용 엣지 생성 헬퍼 */
function makeEdge(from: string, to: string, weight = 0.8): KnowledgeEdge {
  return {
    from: toNodeId(from),
    to: toNodeId(to),
    type: 'LINK',
    weight,
  };
}

/** 그래프를 인접 리스트 + edgeWeightMap 포함하여 빌드 */
function buildGraphWithIndex(
  nodes: Map<ReturnType<typeof toNodeId>, KnowledgeNode>,
  edges: KnowledgeEdge[],
): KnowledgeGraph {
  const adjacencyList = buildAdjacencyList(nodes, edges);
  const edgeWeightMap = new Map<
    ReturnType<typeof toNodeId>,
    Map<ReturnType<typeof toNodeId>, number>
  >();
  for (const edge of edges) {
    if (!edgeWeightMap.has(edge.from)) {
      edgeWeightMap.set(edge.from, new Map());
    }
    edgeWeightMap.get(edge.from)!.set(edge.to, edge.weight);
  }

  return {
    nodes,
    edges,
    adjacencyList,
    edgeWeightMap,
    builtAt: '2026-03-07T00:00:00Z',
    nodeCount: nodes.size,
    edgeCount: edges.length,
  };
}

// ========================================
// B3: Variable Seed Activation Scoring
// ========================================
describe('B3: resolveSeedNodes — ScoredSeed classification', () => {
  function makeClassificationGraph(): KnowledgeGraph {
    const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
    nodes.set(
      toNodeId('k8s-setup.md'),
      makeNode('k8s-setup.md', Layer.L2_DERIVED, {
        title: 'Kubernetes Cluster Setup',
        tags: ['devops', 'infrastructure'],
      }),
    );
    nodes.set(
      toNodeId('kube-related.md'),
      makeNode('kube-related.md', Layer.L3_EXTERNAL, {
        title: 'Cloud Deployment Notes',
        tags: ['kube', 'cloud'],
      }),
    );
    nodes.set(
      toNodeId('docker-compose.md'),
      makeNode('docker-compose.md', Layer.L2_DERIVED, {
        title: 'Docker Compose Guide',
        tags: ['docker', 'containers'],
      }),
    );

    return buildGraphWithIndex(nodes, []);
  }

  it('경로 매칭은 score 1.0, matchType path-exact', () => {
    const graph = makeClassificationGraph();
    const seeds = resolveSeedNodes(graph, ['k8s-setup.md']);
    expect(seeds).toHaveLength(1);
    expect(seeds[0]!.matchScore).toBe(1.0);
    expect(seeds[0]!.matchType).toBe('path-exact');
  });

  it('제목 정확 매칭은 score 1.0, matchType title-exact', () => {
    const graph = makeClassificationGraph();
    const seeds = resolveSeedNodes(graph, ['kubernetes cluster setup']);
    const k8sSeed = seeds.find((s) => s.nodeId === toNodeId('k8s-setup.md'));
    expect(k8sSeed).toBeDefined();
    expect(k8sSeed!.matchScore).toBe(1.0);
    expect(k8sSeed!.matchType).toBe('title-exact');
  });

  it('제목 단어 경계 매칭은 score 0.8, matchType title-word', () => {
    const graph = makeClassificationGraph();
    const seeds = resolveSeedNodes(graph, ['kubernetes']);
    const k8sSeed = seeds.find((s) => s.nodeId === toNodeId('k8s-setup.md'));
    expect(k8sSeed).toBeDefined();
    expect(k8sSeed!.matchScore).toBe(0.8);
    expect(k8sSeed!.matchType).toBe('title-word');
  });

  it('태그 정확 매칭은 score 0.5, matchType tag-exact', () => {
    const graph = makeClassificationGraph();
    const seeds = resolveSeedNodes(graph, ['kube']);
    const kubeSeed = seeds.find(
      (s) => s.nodeId === toNodeId('kube-related.md'),
    );
    expect(kubeSeed).toBeDefined();
    expect(kubeSeed!.matchScore).toBe(0.5);
    expect(kubeSeed!.matchType).toBe('tag-exact');
  });

  it('태그 prefix 매칭은 score 0.3, matchType tag-prefix', () => {
    const graph = makeClassificationGraph();
    const seeds = resolveSeedNodes(graph, ['infra']);
    const infraSeed = seeds.find(
      (s) => s.nodeId === toNodeId('k8s-setup.md'),
    );
    expect(infraSeed).toBeDefined();
    expect(infraSeed!.matchScore).toBe(0.3);
    expect(infraSeed!.matchType).toBe('tag-prefix');
  });

  it('다중 키워드에서 노드별 최고 점수 유지', () => {
    const graph = makeClassificationGraph();
    // 'kubernetes' → title-word(0.8), 'devops' → tag-exact(0.5)
    const seeds = resolveSeedNodes(graph, ['kubernetes', 'devops']);
    const k8sSeed = seeds.find((s) => s.nodeId === toNodeId('k8s-setup.md'));
    expect(k8sSeed!.matchScore).toBe(0.8); // 더 높은 점수 유지
  });
});

describe('B3: SA seedActivations — title-match vs tag-match ranking', () => {
  it('title-match 시드의 이웃이 tag-match 시드의 이웃보다 높은 순위', () => {
    const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
    // Title-match node: 높은 seed activation
    nodes.set(
      toNodeId('A'),
      makeNode('A', Layer.L2_DERIVED, {
        title: 'Kubernetes Setup',
        tags: [],
      }),
    );
    // Tag-match node: 낮은 seed activation
    nodes.set(
      toNodeId('B'),
      makeNode('B', Layer.L2_DERIVED, {
        title: 'Cloud Notes',
        tags: ['kubernetes-related'],
      }),
    );
    // A의 이웃
    nodes.set(
      toNodeId('C'),
      makeNode('C', Layer.L2_DERIVED, { title: 'A-neighbor' }),
    );
    // B의 이웃
    nodes.set(
      toNodeId('D'),
      makeNode('D', Layer.L2_DERIVED, { title: 'B-neighbor' }),
    );

    const edges = [
      makeEdge('A', 'C', 0.8),
      makeEdge('B', 'D', 0.8),
    ];

    const graph = buildGraphWithIndex(nodes, edges);

    // seedActivations: A=0.8 (title-word), B=0.3 (tag-prefix)
    const seedActivations = new Map([
      [toNodeId('A'), 0.8],
      [toNodeId('B'), 0.3],
    ]);

    const results = runSpreadingActivation(
      graph,
      [toNodeId('A'), toNodeId('B')],
      { seedActivations, decayOverride: 0.7 },
    );

    const cScore =
      results.find((r) => r.nodeId === toNodeId('C'))?.score ?? 0;
    const dScore =
      results.find((r) => r.nodeId === toNodeId('D'))?.score ?? 0;
    expect(cScore).toBeGreaterThan(dScore);
  });
});

// ========================================
// B1: Adaptive SA Parameters
// ========================================
describe('B1: Adaptive SA Parameters', () => {
  /** 5-node chain: A-B-C-D-E */
  function makeChainGraph(): KnowledgeGraph {
    const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
    const ids = ['chain-a.md', 'chain-b.md', 'chain-c.md', 'chain-d.md', 'chain-e.md'];
    for (const id of ids) {
      nodes.set(
        toNodeId(id),
        makeNode(id, Layer.L2_DERIVED, { title: `Node ${id}` }),
      );
    }

    const edges = [
      makeEdge('chain-a.md', 'chain-b.md', 0.8),
      makeEdge('chain-b.md', 'chain-c.md', 0.8),
      makeEdge('chain-c.md', 'chain-d.md', 0.8),
      makeEdge('chain-d.md', 'chain-e.md', 0.8),
    ];

    return buildGraphWithIndex(nodes, edges);
  }

  it('strong signal (exact path) → 2-hop 결과만 반환', () => {
    const graph = makeChainGraph();
    const result = query(graph, ['chain-a.md'], {
      adaptiveSA: true,
      decay: 0.7,
      threshold: 0.01,
    });

    // seed 'chain-a.md'는 제외됨, B/C만 2-hop 이내
    const resultIds = result.results.map((r) => r.nodeId);
    expect(resultIds).toContain(toNodeId('chain-b.md'));
    expect(resultIds).toContain(toNodeId('chain-c.md'));
    expect(resultIds).not.toContain(toNodeId('chain-d.md'));
    expect(resultIds).not.toContain(toNodeId('chain-e.md'));
  });

  it('weak keyword → full depth 탐색 유지', () => {
    const nodes = new Map<ReturnType<typeof toNodeId>, KnowledgeNode>();
    const ids = ['w-a.md', 'w-b.md', 'w-c.md', 'w-d.md'];
    for (const id of ids) {
      nodes.set(
        toNodeId(id),
        makeNode(id, Layer.L2_DERIVED, {
          title: `Doc ${id}`,
          tags: ['weakprefix-something'],
        }),
      );
    }

    const edges = [
      makeEdge('w-a.md', 'w-b.md', 0.8),
      makeEdge('w-b.md', 'w-c.md', 0.8),
      makeEdge('w-c.md', 'w-d.md', 0.8),
    ];

    const graph = buildGraphWithIndex(nodes, edges);
    // 'weakprefix' → tag-prefix match (score 0.3) → weak signal → full depth
    const result = query(graph, ['weakprefix'], {
      adaptiveSA: true,
      decay: 0.9,
      threshold: 0.01,
      maxHops: 5,
    });

    // weak signal이므로 user-provided maxHops=5가 그대로 사용됨
    // 시드는 여러 개 (모두 tag-prefix match)이므로 결과가 존재해야 함
    expect(result.seedIds.length).toBeGreaterThan(0);
  });

  it('user-explicit maxHops overrides adaptive', () => {
    const graph = makeChainGraph();
    const result = query(graph, ['chain-a.md'], {
      adaptiveSA: true,
      maxHops: 4,
      decay: 0.7,
      threshold: 0.01,
    });

    // maxHops가 명시적으로 4이므로 adaptive override 안 됨
    const resultIds = result.results.map((r) => r.nodeId);
    expect(resultIds).toContain(toNodeId('chain-d.md'));
  });

  it('adaptiveSA: false → adaptive 비활성화, maxHops 기본값 사용', () => {
    const graph = makeChainGraph();
    const result = query(graph, ['chain-a.md'], {
      adaptiveSA: false,
      decay: 0.9,
      threshold: 0.001,
    });

    // adaptive 비활성화 → 기본 maxHops=5, strong signal이어도 축소 안 됨
    // D는 3홉이므로 adaptive=true면 maxHops=2로 잘림, false면 도달
    const resultIds = result.results.map((r) => r.nodeId);
    expect(resultIds).toContain(toNodeId('chain-d.md'));
  });
});

// ========================================
// B4-lite: extractBestSnippet
// ========================================
describe('B4-lite: extractBestSnippet', () => {
  it('키워드 매칭 단락을 반환한다', () => {
    const content =
      'para1 about dogs\n\npara2 about kubernetes config\n\npara3 about cats';
    const result = extractBestSnippet(content, ['kubernetes']);
    expect(result).toBe('para2 about kubernetes config');
  });

  it('매칭 없으면 첫 번째 비어있지 않은 단락 반환', () => {
    const content = 'no matches here\n\nanother paragraph';
    const result = extractBestSnippet(content, ['xyz']);
    expect(result).toBe('no matches here');
  });

  it('maxLength 초과 시 truncate', () => {
    const longParagraph = 'kubernetes '.repeat(100);
    const content = `short intro\n\n${longParagraph}`;
    const result = extractBestSnippet(content, ['kubernetes'], 50);
    expect(result.length).toBe(50);
  });

  it('frontmatter 블록은 건너뛴다', () => {
    const content =
      '---\ntitle: Test\n---\n\nactual content about kubernetes\n\nanother para';
    const result = extractBestSnippet(content, ['kubernetes']);
    expect(result).toBe('actual content about kubernetes');
  });

  it('빈 내용이면 빈 문자열 반환', () => {
    const result = extractBestSnippet('', ['test']);
    expect(result).toBe('');
  });

  it('다중 키워드 매칭 시 가장 많이 매칭되는 단락 선택', () => {
    const content =
      'about docker only\n\nabout kubernetes and docker together\n\nabout nothing';
    const result = extractBestSnippet(content, ['kubernetes', 'docker']);
    expect(result).toBe('about kubernetes and docker together');
  });
});

// ========================================
// B6: Directive Update
// ========================================
describe('B6: Turn Context Directive', () => {
  // Import is side-effect free — we test the exported function output
  it('buildTurnContext에 kg_context snippet 언급이 포함되어야 한다', async () => {
    // We test the directive text directly from the module
    const { buildTurnContext } = await import(
      '../../hooks/turn-context-builder.js'
    );
    // buildTurnContext needs a CWD with .maencof — mock by using a non-vault dir
    // The directive text is hardcoded so we can verify it from the source
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../../hooks/turn-context-builder.ts', import.meta.url).pathname
        .replace('/src/__tests__/unit/../../', '/src/'),
      'utf-8',
    );
    expect(source).toContain('content snippets from top documents');
    expect(source).toContain(
      'Prefer kg_context over kg_search + maencof_read',
    );
  });

  it('context-injector에 kg_context snippet directive가 포함되어야 한다', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../../hooks/context-injector.ts', import.meta.url).pathname
        .replace('/src/__tests__/unit/../../', '/src/'),
      'utf-8',
    );
    expect(source).toContain(
      'kg_context now returns content snippets from top results',
    );
  });
});
