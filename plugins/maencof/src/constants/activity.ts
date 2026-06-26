import type { ActivityCategory } from '../types/activity.js';

import { McpToolName } from './mcpToolNames.js';

/**
 * MCP 도구명 → 활동 카테고리 매핑.
 *
 * PostToolUse 훅(activityRecorder)이 write 도구 호출을 활동 로그에 기록할 때 사용한다.
 * 읽기 전용 도구(`activity_read`, `work_history`)는 제외 — 재귀/노이즈 방지.
 */
export const TOOL_CATEGORY_MAP: Record<string, ActivityCategory> = {
  [McpToolName.CREATE]: 'document',
  [McpToolName.READ]: 'document',
  [McpToolName.UPDATE]: 'document',
  [McpToolName.DELETE]: 'document',
  [McpToolName.MOVE]: 'document',
  [McpToolName.CAPTURE_INSIGHT]: 'document',
  [McpToolName.KG_SEARCH]: 'search',
  [McpToolName.KG_NAVIGATE]: 'search',
  [McpToolName.KG_CONTEXT]: 'search',
  [McpToolName.KG_BUILD]: 'index',
  [McpToolName.KG_STATUS]: 'index',
  [McpToolName.KG_SUGGEST_LINKS]: 'search',
  [McpToolName.BOUNDARY_CREATE]: 'document',
  [McpToolName.CLAUDEMD_MERGE]: 'config',
  [McpToolName.CLAUDEMD_READ]: 'config',
  [McpToolName.CLAUDEMD_REMOVE]: 'config',
};
