/**
 * @file detectCommunities.ts
 * @description 순수 함수 형태의 커뮤니티 탐지 — P0 STUB.
 */
import type { KnowledgeGraph } from '../../../types/graph.js';
import type {
  CommunityDetectionResult,
  CommunityDetectorParams,
} from '../types/types.js';

import { CommunityDetector } from './communityDetector.js';

/**
 * 순수 함수 형태의 커뮤니티 탐지
 *
 * P0 STUB
 */
export function detectCommunities(
  graph: KnowledgeGraph,
  params?: CommunityDetectorParams,
): CommunityDetectionResult {
  const detector = new CommunityDetector(params);
  return detector.detectCommunities(graph);
}
