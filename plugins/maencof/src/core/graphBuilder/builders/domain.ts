/**
 * @file domain.ts
 * @description 동일 domain 태그 노드 쌍 간 DOMAIN 엣지(약한 cross-layer 연결, weight=0.3) 생성.
 */
import type { KnowledgeEdge, KnowledgeNode } from '../../../types/graph.js';

/**
 * 동일 domain 태그를 가진 노드 간 DOMAIN 엣지 생성 (cross-layer 연결).
 * weight=0.3, 양방향. 시스템 생성 엣지로 user-authored LINK와 구분된다.
 */
export function buildDomainEdges(nodes: KnowledgeNode[]): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];
  type DomainExt = KnowledgeNode & { domain?: string };

  const domainMap = new Map<string, DomainExt[]>();
  for (const node of nodes) {
    const ext = node as DomainExt;
    if (ext.domain) {
      if (!domainMap.has(ext.domain)) domainMap.set(ext.domain, []);

      domainMap.get(ext.domain)!.push(ext);
    }
  }

  for (const [, group] of domainMap) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        edges.push({ from: a.id, to: b.id, type: 'DOMAIN', weight: 0.3 });
        edges.push({ from: b.id, to: a.id, type: 'DOMAIN', weight: 0.3 });
      }
  }

  return edges;
}
