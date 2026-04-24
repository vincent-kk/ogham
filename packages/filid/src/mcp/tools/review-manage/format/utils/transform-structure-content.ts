import { parseStructureCheckFrontmatter } from '../../../../../core/pr-summary/index.js';
import { resultEmoji } from './result-emoji.js';

const STAGE_DISPLAY_NAMES: Record<string, string> = {
  structure: 'Structure',
  documents: 'Documents',
  tests: 'Tests',
  metrics: 'Metrics',
  dependencies: 'Dependencies',
};

export function transformStructureContent(content: string): string {
  const fm = parseStructureCheckFrontmatter(content);
  if (!fm) return content;

  const bodyContent = content.replace(/^---\n[\s\S]*?\n---\n*/, '');

  const lines: string[] = [];
  lines.push('| Stage | Result |');
  lines.push('| :--- | :---: |');
  for (const [key, result] of Object.entries(fm.stageResults)) {
    const name = STAGE_DISPLAY_NAMES[key] ?? key;
    lines.push(`| ${name} | ${resultEmoji(result)} ${result} |`);
  }
  const overallEmoji = resultEmoji(fm.overall);
  lines.push(`| **Overall** | ${overallEmoji} **${fm.overall}** |`);

  if (fm.criticalCount > 0) {
    lines.push('');
    lines.push(`> ⚠️ Critical issues: **${fm.criticalCount}**`);
  }

  const summaryTable = lines.join('\n');
  return summaryTable + (bodyContent ? '\n\n' + bodyContent : '');
}
