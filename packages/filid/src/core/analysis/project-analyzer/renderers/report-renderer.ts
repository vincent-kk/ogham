import type { AnalysisReport, RenderedReport } from '../../../../types/report.js';

import { renderMarkdownReport } from './render-markdown-report.js';
import { renderTextReport } from './render-text-report.js';

export { renderTextReport } from './render-text-report.js';
export { renderMarkdownReport } from './render-markdown-report.js';

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
