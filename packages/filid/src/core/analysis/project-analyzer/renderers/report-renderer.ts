/**
 * @file report-renderer.ts
 * @description AnalysisReport를 text/json/markdown 형식으로 렌더링한다.
 */
import type { AnalysisReport, RenderedReport } from '../../../../types/report.js';

/**
 * AnalysisReport를 지정된 형식으로 렌더링한다.
 */
export function generateReport(
  analysis: AnalysisReport,
  outputConfig: { format: 'text' | 'json' | 'markdown'; verbose?: boolean },
): RenderedReport {
  const start = Date.now();
  let content: string;

  switch (outputConfig.format) {
    case 'json':
      content = JSON.stringify(
        {
          ...analysis,
          scan: {
            ...analysis.scan,
            tree: {
              root: analysis.scan.tree.root,
              totalNodes: analysis.scan.tree.totalNodes,
              depth: analysis.scan.tree.depth,
            },
          },
        },
        null,
        2,
      );
      break;
    case 'markdown':
      content = renderMarkdownReport(analysis);
      break;
    default:
      content = renderTextReport(analysis, outputConfig);
  }

  return {
    content,
    format: outputConfig.format,
    duration: Date.now() - start,
  };
}

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
