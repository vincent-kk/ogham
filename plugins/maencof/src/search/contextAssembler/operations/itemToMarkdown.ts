/**
 * @file itemToMarkdown.ts
 * @description ContextItem을 마크다운 줄로 직렬화한다.
 */
import type { ContextItem } from '../types/types.js';

import { layerName } from './layerName.js';

export function itemToMarkdown(
  item: ContextItem,
  includeFull: boolean,
): string {
  const scoreStr = item.score.toFixed(3);
  const tagsStr = item.tags.slice(0, 5).join(', ');
  const header = `- **[${item.title}](${item.path})** (L${item.layer}-${layerName(item.layer)}, score=${scoreStr}, ${item.relation})`;
  const meta = `  - tags: ${tagsStr || '(none)'}`;

  if (includeFull && item.fullContent) {
    const contentPreview = item.fullContent.slice(0, 500);
    return `${header}\n${meta}\n  \`\`\`\n  ${contentPreview}\n  \`\`\``;
  }

  return `${header}\n${meta}`;
}
