/**
 * @file buildToolDescription.ts
 * @description MCP 도구명 + 입력에서 사람이 읽기 좋은 활동 설명을 생성한다.
 */
import { TOOL_CATEGORY_MAP } from '../../constants/activity.js';

export function buildToolDescription(
  toolName: string,
  toolInput: Record<string, unknown>,
): string {
  const category = TOOL_CATEGORY_MAP[toolName];

  switch (toolName) {
    case 'create': {
      const layer = toolInput['layer'] ?? '?';
      const tags = Array.isArray(toolInput['tags'])
        ? (toolInput['tags'] as string[]).join(', ')
        : '';
      return `Document created (L${layer}${tags ? `, tags: ${tags}` : ''})`;
    }
    case 'update':
      return 'Document updated';
    case 'delete':
      return 'Document deleted';
    case 'move': {
      const target = toolInput['target_layer'] ?? '?';
      return `Document moved (→ L${target})`;
    }
    case 'claudemd_merge':
      return 'CLAUDE.md directive merged';
    case 'claudemd_remove':
      return 'CLAUDE.md directive removed';
    case 'claudemd_read':
      return 'CLAUDE.md directive read';
    case 'kg_search': {
      const seed = Array.isArray(toolInput['seed'])
        ? (toolInput['seed'] as string[]).join(', ')
        : '';
      return `KG search (seed: ${seed})`;
    }
    case 'kg_navigate':
      return 'KG navigation';
    case 'kg_context':
      return 'Context assembly';
    case 'kg_build':
      return toolInput['force']
        ? 'Full index rebuild'
        : 'Incremental index build';
    case 'kg_status':
      return 'Vault status check';
    case 'kg_suggest_links':
      return 'Link suggestion';
    default:
      return category ? `${category} task` : toolName;
  }
}
