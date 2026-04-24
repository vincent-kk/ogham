import type { AnalysisReport } from '../../../../types/report.js';

export function renderTextReport(
  analysis: AnalysisReport,
  _config: { verbose?: boolean },
): string {
  const { summary, validation, drift } = analysis;
  const lines: string[] = [
    'filid v2 Analysis Report',
    '═══════════════════════════════════════',
    `Root: ${analysis.scan.tree.root}`,
    `Scanned: ${analysis.scan.timestamp} | Duration: ${analysis.scan.duration}ms`,
    '',
    'Summary',
    '───────────────────────────────────────',
    `Total Modules  : ${summary.totalModules}`,
    `Violations     : ${summary.violations}`,
    `Drifts         : ${summary.drifts}`,
    `Health Score   : ${summary.healthScore} / 100`,
  ];

  if (validation.result.violations.length > 0) {
    lines.push('', 'Violations', '───────────────────────────────────────');
    for (const v of validation.result.violations) {
      lines.push(`[${v.severity.toUpperCase()}] ${v.ruleId}`);
      lines.push(`  ${v.message}`);
      if (v.suggestion) lines.push(`  Suggestion: ${v.suggestion}`);
    }
  }

  if (drift.drift.items.length > 0) {
    lines.push('', 'Drifts', '───────────────────────────────────────');
    for (const item of drift.drift.items) {
      lines.push(
        `[${item.severity.toUpperCase()}] ${item.path} — ${item.rule}`,
      );
      lines.push(`  Expected: ${item.expected}`);
      lines.push(`  Actual:   ${item.actual}`);
      lines.push(`  Action:   ${item.suggestedAction}`);
    }
  }

  return lines.join('\n');
}
