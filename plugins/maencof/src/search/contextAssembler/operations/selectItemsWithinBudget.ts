/**
 * @file selectItemsWithinBudget.ts
 * @description 토큰 예산 내에서 항목을 선택하고 남은 개수를 반환한다.
 */
import type { ContextItem } from '../types/types.js';

import { buildMarkdown } from './buildMarkdown.js';
import { estimateTokens } from './estimateTokens.js';
import { itemToMarkdown } from './itemToMarkdown.js';

/** 안내문까지 계상한 전체 출력이 예산에 맞도록 점수 순 후보를 선택한다. */
export function selectItemsWithinBudget(
  allItems: ContextItem[],
  tokenBudget: number,
): {
  selectedItems: ContextItem[];
  totalTokens: number;
  truncatedCount: number;
  markdown: string;
} {
  const selectedItems: ContextItem[] = [];
  let totalTokens = estimateTokens('## maencof Knowledge Context\n\n');
  let truncatedCount = 0;

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const itemTokens = estimateTokens(itemToMarkdown(item));
    if (totalTokens + itemTokens > tokenBudget) {
      truncatedCount = allItems.length - i;
      break;
    }
    selectedItems.push(item);
    totalTokens += itemTokens;
  }

  let markdown = buildMarkdown(selectedItems, truncatedCount);
  totalTokens = estimateTokens(markdown);
  while (totalTokens > tokenBudget && selectedItems.length > 0) {
    selectedItems.pop();
    truncatedCount++;
    markdown = buildMarkdown(selectedItems, truncatedCount);
    totalTokens = estimateTokens(markdown);
  }
  if (totalTokens > tokenBudget) {
    markdown = '';
    totalTokens = 0;
  }

  return { selectedItems, totalTokens, truncatedCount, markdown };
}
