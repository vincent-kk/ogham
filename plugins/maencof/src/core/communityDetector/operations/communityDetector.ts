/**
 * @file communityDetector.ts
 * @description 커뮤니티 탐지 엔진 — P0 STUB 구현.
 *
 * P0: 빈 배열 반환 (stub)
 * TODO(P2): Louvain / Label Propagation 알고리즘 구현
 */
import type { KnowledgeGraph } from '../../../types/graph.js';
import type {
  CommunityDetectionResult,
  CommunityDetectorParams,
} from '../types/types.js';

/**
 * 커뮤니티 탐지 엔진
 *
 * P0 STUB: detectCommunities()는 빈 배열을 반환합니다.
 * TODO(P2): Leiden 또는 Louvain 알고리즘으로 실제 커뮤니티 탐지 구현
 *
 * @example
 * ```ts
 * const detector = new CommunityDetector();
 * const result = detector.detectCommunities(graph);
 * // P0: result.communities === []
 * ```
 */
export class CommunityDetector {
  private readonly params: CommunityDetectorParams;

  constructor(params: CommunityDetectorParams = {}) {
    this.params = params;
    void this.params; // P2에서 사용 예정
  }

  /**
   * 커뮤니티 탐지 실행
   *
   * P0 STUB: 빈 배열 반환
   * TODO(P2): 실제 Louvain / Label Propagation 구현
   */
  detectCommunities(_graph: KnowledgeGraph): CommunityDetectionResult {
    // TODO(P2): Louvain 또는 Label Propagation 알고리즘 구현
    // 구현 시 고려사항:
    // - 노드 간 엣지 가중치 활용
    // - Layer별 커뮤니티 경계 우선 적용
    // - 커뮤니티 레이블은 공통 태그 또는 디렉토리 기준
    return {
      communities: [],
      modularity: 0,
      algorithm: 'stub-p0',
    };
  }
}
