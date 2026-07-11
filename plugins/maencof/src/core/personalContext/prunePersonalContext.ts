/**
 * @file prunePersonalContext.ts
 * @description 세션 경계(MCP bootSweep) 수명주기 정리 — 만료 state 제거, due 경과 자동 resolve,
 * resolved topic 보존 기간 경과 제거, 보존 캡 방어.
 *
 * 파일이 없으면 아무것도 만들지 않는다. 변경이 있을 때만 쓴다
 * (불필요한 mtime 변경 → vault auto-commit 소음 방지).
 */
import {
  OVERDUE_TOPIC_GRACE_DAYS,
  RESOLVED_TOPIC_RETENTION_DAYS,
} from '../../constants/personalContext.js';

import { evictTopicsOverCap } from './evictTopicsOverCap.js';
import { isStateActive } from './isStateActive.js';
import { readPersonalContext } from './readPersonalContext.js';
import { writePersonalContext } from './writePersonalContext.js';

const DAY_MS = 86_400_000;

export interface PersonalContextPruneResult {
  changed: boolean;
  removedStates: number;
  autoResolvedTopics: number;
  removedTopics: number;
}

export function prunePersonalContext(
  cwd: string,
  now: Date = new Date(),
): PersonalContextPruneResult {
  const result: PersonalContextPruneResult = {
    changed: false,
    removedStates: 0,
    autoResolvedTopics: 0,
    removedTopics: 0,
  };
  const model = readPersonalContext(cwd);
  // disable 시 항목을 동결한다 — capture/render와 동일한 게이트. 만료 정리조차
  // 하지 않아 재활성 시 상태가 그대로 복원된다 (SKILL "kept untouched" 계약).
  // 파일 부재 시 readPersonalContext가 빈 default를 주므로 changed=false로 no-op.
  if (!model.config.enabled) return result;

  const nowMs = now.getTime();
  const nowIso = now.toISOString();

  const keptStates = model.states.filter((state) =>
    isStateActive(state, nowMs),
  );
  result.removedStates = model.states.length - keptStates.length;
  model.states = keptStates;

  for (const topic of model.topics) {
    if (topic.status !== 'active' || !topic.due) continue;
    const dueMs = Date.parse(topic.due);
    if (
      Number.isNaN(dueMs) ||
      dueMs + OVERDUE_TOPIC_GRACE_DAYS * DAY_MS > nowMs
    )
      continue;
    topic.status = 'resolved';
    topic.lastSeenAt = nowIso;
    result.autoResolvedTopics += 1;
  }

  const keptTopics = model.topics.filter((topic) => {
    if (topic.status !== 'resolved') return true;
    const lastSeenMs = Date.parse(topic.lastSeenAt);
    return (
      Number.isNaN(lastSeenMs) ||
      lastSeenMs + RESOLVED_TOPIC_RETENTION_DAYS * DAY_MS > nowMs
    );
  });
  result.removedTopics = model.topics.length - keptTopics.length;

  const eviction = evictTopicsOverCap(keptTopics);
  result.removedTopics += eviction.removed;
  model.topics = eviction.topics;

  result.changed =
    result.removedStates > 0 ||
    result.autoResolvedTopics > 0 ||
    result.removedTopics > 0;
  if (result.changed) writePersonalContext(cwd, model);
  return result;
}
