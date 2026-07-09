/**
 * @file buildMarkdown.ts
 * @description 선택된 항목들을 마크다운 블록으로 조립한다.
 */
import type { ContextItem } from '../types/types.js';

import { itemToMarkdown } from './itemToMarkdown.js';

export function buildMarkdown(
  selectedItems: ContextItem[],
  truncatedCount: number,
  includeFull: boolean,
): string {
  const lines: string[] = ['## maencof Knowledge Context', ''];

  if (selectedItems.length === 0) lines.push('_No related documents found._');
  else {
    lines.push(
      `_${selectedItems.length} document(s) (by score, descending)_`,
      '',
    );
    for (const item of selectedItems)
      lines.push(
        itemToMarkdown(item, includeFull && item.fullContent !== undefined),
      );
  }

  if (truncatedCount > 0)
    lines.push(
      '',
      `_${truncatedCount} document(s) excluded due to token budget limit_`,
    );

  return lines.join('\n');
}
