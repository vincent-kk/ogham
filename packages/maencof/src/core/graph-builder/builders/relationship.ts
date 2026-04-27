/**
 * @file relationship.ts
 * @description Person frontmatter 기반 RELATIONSHIP 엣지 생성. 대칭 관계는 양방향, 비대칭은 단방향.
 */
import type { KnowledgeEdge, KnowledgeNode } from '../../../types/graph.js';
import { SYMMETRIC_RELATIONSHIPS } from '../../../types/person.js';

/**
 * Person frontmatter가 있는 노드 쌍 간 RELATIONSHIP 엣지 생성.
 * 대칭 관계: 양방향 엣지 2개, 비대칭 관계: 단방향 엣지 1개.
 */
export function buildRelationshipEdges(nodes: KnowledgeNode[]): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];
  type PersonExt = KnowledgeNode & {
    person?: { relationship_type?: string; intimacy_level?: number };
  };

  const personNodes = nodes.filter(
    (n) => (n as PersonExt).person !== undefined,
  ) as PersonExt[];

  for (let i = 0; i < personNodes.length; i++) {
    for (let j = i + 1; j < personNodes.length; j++) {
      const a = personNodes[i];
      const b = personNodes[j];
      const relType = a.person?.relationship_type ?? '';
      const weight = 0.6;

      if (isSymmetricRelationship(relType)) {
        edges.push({ from: a.id, to: b.id, type: 'RELATIONSHIP', weight });
        edges.push({ from: b.id, to: a.id, type: 'RELATIONSHIP', weight });
      } else {
        edges.push({ from: a.id, to: b.id, type: 'RELATIONSHIP', weight });
      }
    }
  }

  return edges;
}

/** 대칭 관계 여부 확인 */
function isSymmetricRelationship(type: string): boolean {
  return (SYMMETRIC_RELATIONSHIPS as readonly string[]).includes(type);
}
