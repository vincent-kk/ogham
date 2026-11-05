import { describe, expect, it, vi } from 'vitest';

import { Layer, toNodeId } from '../../../../../types/common.js';
import type { KnowledgeNode } from '../../../../../types/graph.js';
import { buildCrossLayerEdges } from '../crossLayer.js';
import { buildDomainEdges } from '../domain.js';
import { buildRelationshipEdges } from '../relationship.js';
import { buildHierarchyEdges } from '../tree.js';

vi.mock('../../../../../constants/thresholds.js', () => ({
  MAX_CROSS_LAYER_EDGES_PER_NODE: 50,
  GENERATED_EDGE_WEIGHTS: {
    hierarchy: 0.91,
    crossLayer: 0.82,
    domain: 0.73,
    relationship: 0.64,
  },
}));

/** 각 빌더의 정책 변경 전파를 검증하는 두 노드이며 실제 저장 값은 사용하지 않는다. */
const nodes: KnowledgeNode[] = [
  '03_External/index.md',
  '03_External/team/member.md',
].map((path, index) => ({
  id: toNodeId(path),
  path,
  title: path,
  layer: Layer.L3_EXTERNAL,
  tags: ['shared'],
  domain: 'shared',
  hub: index === 0,
  person: {
    name: 'Test person',
    relationship_type: 'friend',
    intimacy_level: 3,
  },
  created: '2026-01-01',
  updated: '2026-01-01',
  mtime: 0,
  accessed_count: 0,
}));

describe('generated edge weight policy', () => {
  it('applies the shared hierarchy weight to both directions', () => {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    expect(
      buildHierarchyEdges(nodes, nodeMap).map((edge) => edge.weight),
    ).toEqual([0.91, 0.91]);
  });

  it('applies the shared cross-layer weight to both directions', () => {
    expect(buildCrossLayerEdges(nodes).map((edge) => edge.weight)).toEqual([
      0.82, 0.82,
    ]);
  });

  it('applies the shared domain weight to both directions', () => {
    expect(buildDomainEdges(nodes).map((edge) => edge.weight)).toEqual([
      0.73, 0.73,
    ]);
  });

  it('applies the shared relationship weight to both directions', () => {
    expect(buildRelationshipEdges(nodes).map((edge) => edge.weight)).toEqual([
      0.64, 0.64,
    ]);
  });
});
