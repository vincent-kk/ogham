import type { ActivityCategory } from '../types/activity.js';

/**
 * MCP 도구명 → 활동 카테고리 매핑.
 *
 * PostToolUse 훅(activityRecorder)이 write 도구 호출을 활동 로그에 기록할 때 사용한다.
 * 읽기 전용 도구(`activity_read`, `work_history`)는 제외 — 재귀/노이즈 방지.
 */
export const TOOL_CATEGORY_MAP: Record<string, ActivityCategory> = {
  create: 'document',
  read: 'document',
  update: 'document',
  delete: 'document',
  move: 'document',
  capture_insight: 'document',
  kg_search: 'search',
  kg_navigate: 'search',
  kg_context: 'search',
  kg_build: 'index',
  kg_status: 'index',
  kg_suggest_links: 'search',
  boundary_create: 'document',
  claudemd_merge: 'config',
  claudemd_read: 'config',
  claudemd_remove: 'config',
};
