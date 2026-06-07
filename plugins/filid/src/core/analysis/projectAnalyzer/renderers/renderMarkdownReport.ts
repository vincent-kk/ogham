import type { AnalysisReport } from '../../../../types/report.js';

export function renderMarkdownReport(analysis: AnalysisReport): string {
  const { summary, validation, drift } = analysis;
  const lines: string[] = [
    '# filid v2 Analysis Report',
    '',
    `**Root:** \`${analysis.scan.tree.root}\`  `,
    `**Scanned:** ${analysis.scan.timestamp}  `,
    `**Duration:** ${analysis.scan.duration}ms`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Modules | ${summary.totalModules} |`,
    `| Violations | ${summary.violations} |`,
    `| Drifts | ${summary.drifts} |`,
    `| Health Score | ${summary.healthScore} / 100 |`,
  ];

  if (validation.result.violations.length > 0) {
    lines.push('', '## Violations', '');
    for (const v of validation.result.violations) {
      lines.push(`### \`${v.ruleId}\` (${v.severity})`);
      lines.push('');
      lines.push(`- **Path:** \`${v.path}\``);
      lines.push(`- **Message:** ${v.message}`);
      if (v.suggestion) lines.push(`- **Suggestion:** ${v.suggestion}`);
      lines.push('');
    }
  }

  if (drift.drift.items.length > 0) {
    lines.push('## Drifts', '');
    for (const item of drift.drift.items) {
      lines.push(`### \`${item.rule}\` — ${item.severity}`);
      lines.push('');
      lines.push(`- **Path:** \`${item.path}\``);
      lines.push(`- **Expected:** ${item.expected}`);
      lines.push(`- **Actual:** ${item.actual}`);
      lines.push(`- **Action:** \`${item.suggestedAction}\``);
      lines.push('');
    }
  }

  return lines.join('\n');
}
