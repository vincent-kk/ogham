/**
 * @file buildToolDescription.ts
 * @description MCP 도구명 + 입력에서 사람이 읽기 좋은 활동 설명을 생성한다.
 */
import { TOOL_CATEGORY_MAP } from '../../../constants/activity.js';
import { McpToolName } from '../../../constants/mcpToolNames.js';

export function buildToolDescription(
  toolName: string,
  toolInput: Record<string, unknown>,
): string {
  const category = TOOL_CATEGORY_MAP[toolName];

  switch (toolName) {
    case McpToolName.CREATE: {
      const layer = toolInput['layer'] ?? '?';
      const tags = Array.isArray(toolInput['tags'])
        ? (toolInput['tags'] as string[]).join(', ')
        : '';
      return `Document created (L${layer}${tags ? `, tags: ${tags}` : ''})`;
    }
    case McpToolName.UPDATE:
      return 'Document updated';
    case McpToolName.DELETE:
      return 'Document deleted';
    case McpToolName.MOVE: {
      const target = toolInput['target_layer'] ?? '?';
      return `Document moved (→ L${target})`;
    }
    case McpToolName.CLAUDEMD_MERGE:
      return 'CLAUDE.md directive merged';
    case McpToolName.CLAUDEMD_REMOVE:
      return 'CLAUDE.md directive removed';
    case McpToolName.CLAUDEMD_READ:
      return 'CLAUDE.md directive read';
    case McpToolName.KG_SEARCH: {
      const seed = Array.isArray(toolInput['seed'])
        ? (toolInput['seed'] as string[]).join(', ')
        : '';
      return `KG search (seed: ${seed})`;
    }
    case McpToolName.KG_NAVIGATE:
      return 'KG navigation';
    case McpToolName.KG_CONTEXT:
      return 'Context assembly';
    case McpToolName.KG_BUILD:
      return toolInput['force']
        ? 'Full index rebuild'
        : 'Incremental index build';
    case McpToolName.KG_STATUS:
      return 'Vault status check';
    case McpToolName.KG_SUGGEST_LINKS:
      return 'Link suggestion';
    default:
      return category ? `${category} task` : toolName;
  }
}
