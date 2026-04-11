import type { SummaryItem } from '../../../types/summary.js';
import { severityEmoji } from './severity-emoji.js';

/** HumanSummary를 마크다운으로 렌더링한다. */
export function renderMarkdown(
  verdict: string,
  reviewItems: SummaryItem[],
  autoFixItems: SummaryItem[],
): string {
  const lines: string[] = [];

  lines.push('# PR Human Summary (filid 자동 생성)');
  lines.push('');

  if (reviewItems.length > 0) {
    lines.push('## 이 PR에서 확인해야 할 것:');
    for (let i = 0; i < reviewItems.length; i++) {
      const item = reviewItems[i];
      const emoji = severityEmoji(item.severity);
      const pathSuffix = item.path ? ` — \`${item.path}\`` : '';
      lines.push(`${i + 1}. ${emoji} ${item.message}${pathSuffix}`);
    }
    lines.push('');
  }

  if (autoFixItems.length > 0) {
    lines.push('## 자동 수정 가능 항목:');
    for (const item of autoFixItems) {
      const pathSuffix = item.path ? ` — \`${item.path}\`` : '';
      lines.push(`- 🔧 ${item.message}${pathSuffix}`);
    }
    lines.push('');
  }

  lines.push(`> Verdict: **${verdict}**`);

  return lines.join('\n');
}
