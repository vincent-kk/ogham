/**
 * @file selectItemsWithinBudget.ts
 * @description 토큰 예산 내에서 항목을 선택하고 남은 개수를 반환한다.
 */
import type { ContextItem } from '../types/types.js';

import { estimateTokens } from './estimateTokens.js';
import { itemToMarkdown } from './itemToMarkdown.js';

export function selectItemsWithinBudget(
  allItems: ContextItem[],
  tokenBudget: number,
): {
  selectedItems: ContextItem[];
  totalTokens: number;
  truncatedCount: number;
} {
  const selectedItems: ContextItem[] = [];
  let totalTokens = estimateTokens('## maencof Knowledge Context\n\n');
  let truncatedCount = 0;

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const itemTokens = estimateTokens(itemToMarkdown(item, false));
    if (totalTokens + itemTokens > tokenBudget) {
      truncatedCount = allItems.length - i;
      break;
    }
    selectedItems.push(item);
    totalTokens += itemTokens;
  }

  return { selectedItems, totalTokens, truncatedCount };
}
