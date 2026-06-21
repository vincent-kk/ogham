import type { DailynoteCategory } from '../types/dailynote.js';

/**
 * MCP 도구명 → dailynote 카테고리 매핑 (전체 19개 도구 중 16개).
 *
 * PostToolUse hook matcher 는 write 도구 8개 사용
 * (`create`|`update`|`delete`|`move`|`capture_insight`|`boundary_create`|
 *  `claudemd_merge`|`claudemd_remove`).
 * TOOL_CATEGORY_MAP 은 전체 도구를 포함하여 향후 opt-in 확장에 대비한다.
 * `dailynote_read` 는 의도적으로 제외 — 재귀적 기록 방지.
 */
export const TOOL_CATEGORY_MAP: Record<string, DailynoteCategory> = {
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
