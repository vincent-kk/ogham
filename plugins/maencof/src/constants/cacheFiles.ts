export const CACHE_FILES = {
  /** 불변 그래프 저장 세대의 디렉터리. 활성 세대는 GRAPH_META가 지정한다. */
  GENERATIONS: 'generations',
  /** 구포맷 단일 그래프 캐시. 새 저장 성공 후 정리한다. */
  INDEX: 'index.json',
  /** 세대 식별자와 직렬화된 KnowledgeNode[]를 담는 샤드. */
  NODES: 'nodes.json',
  /** 세대 식별자와 직렬화된 KnowledgeEdge[]를 담는 샤드. */
  EDGES: 'edges.json',
  /** 세대별 서고 멤버 샤드. 멤버가 없어도 빈 배열을 저장한다. */
  ARCHIVE_MEMBERS: 'archive-members.json',
  /** 활성 세대와 그래프 메타데이터를 담는 고정 commit marker. */
  GRAPH_META: 'graph-meta.json',
  WEIGHTS: 'weights.json',
  SNAPSHOT: 'snapshot.json',
  COMMUNITIES: 'communities.json',
  STALE_NODES: 'stale-nodes.json',
} as const;
