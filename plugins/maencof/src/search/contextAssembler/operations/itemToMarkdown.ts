/**
 * @file itemToMarkdown.ts
 * @description ContextItem을 마크다운 줄로 직렬화한다.
 */
import type { ContextItem } from '../types/types.js';

import { layerName } from './layerName.js';

export function itemToMarkdown(item: ContextItem): string {
  const scoreStr = item.score.toFixed(3);
  const tagsStr = item.tags.slice(0, 5).join(', ');
  // 접힘 표기는 열기 키를 함께 노출한다 — markdown 만 받는 호출자도
  // kg_search { cluster } 질의를 만들 수 있어야 한다
  const collapsedStr =
    item.collapsedCount !== undefined && item.clusterKey !== undefined
      ? ` (+${item.collapsedCount} collapsed · cluster: ${item.clusterKey})`
      : '';
  const header = `- **[${item.title}](${item.path})** (L${item.layer}-${layerName(item.layer)}, score=${scoreStr}, ${item.relation})${collapsedStr}`;
  const meta = `  - tags: ${tagsStr || '(none)'}`;

  return `${header}\n${meta}`;
}
