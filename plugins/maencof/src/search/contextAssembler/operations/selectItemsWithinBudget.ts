/**
 * @file selectItemsWithinBudget.ts
 * @description 토큰 예산 내에서 항목을 선택하고 남은 개수를 반환한다.
 */
import type { ContextItem } from '../types/types.js';

import { buildMarkdown } from './buildMarkdown.js';
import { estimateTokens } from './estimateTokens.js';
import { itemToMarkdown } from './itemToMarkdown.js';

/**
 * 안내문까지 포함한 전체 출력이 예산에 맞도록 점수 순 후보를 선택한다.
 * @param allItems 점수 내림차순의 유효한 컨텍스트 항목. 배열과 항목은 변경하지 않는다.
 * @param tokenBudget 0 이상의 유한한 토큰 예산. 입력 유효성 검사는 호출자가 맡는다.
 * @returns 순서를 유지한 선택 항목, 전체 markdown의 추정 토큰 수, 제외 수와 markdown.
 * 예산 부족은 예외가 아니며 헤더·안내문도 담지 못하면 빈 markdown과 0 토큰을 반환한다.
 * 유효한 입력에서는 예외를 발생시키지 않으며 외부 상태를 변경하지 않는다.
 */
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
