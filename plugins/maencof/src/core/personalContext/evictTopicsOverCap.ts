/**
 * @file evictTopicsOverCap.ts
 * @description topics 보존 캡(MAX_TOPICS) 집행 — resolved 우선, 다음 oldest-lastSeenAt 제거.
 *
 * 캡처 쓰기(applyPersonalContextMutation)와 세션 경계 정리(prunePersonalContext)가 공유한다.
 */
import { MAX_TOPICS } from '../../constants/personalContext.js';
import type { PersonalTopic } from '../../types/personalContext.js';

export interface TopicEvictionResult {
  topics: PersonalTopic[];
  removed: number;
}

export function evictTopicsOverCap(
  topics: PersonalTopic[],
): TopicEvictionResult {
  if (topics.length <= MAX_TOPICS) return { topics, removed: 0 };

  const byEvictionOrder = [...topics].sort(
    (a, b) =>
      evictionRank(a) - evictionRank(b) ||
      a.lastSeenAt.localeCompare(b.lastSeenAt),
  );
  const evicted = new Set(byEvictionOrder.slice(0, topics.length - MAX_TOPICS));
  return {
    topics: topics.filter((topic) => !evicted.has(topic)),
    removed: evicted.size,
  };
}

function evictionRank(topic: PersonalTopic): number {
  return topic.status === 'resolved' ? 0 : 1;
}
