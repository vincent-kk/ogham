import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { getCacheDir } from '../../../../core/infra/cacheManager/cacheManager.js';
import type {
  ScanReportDto,
  ScanResultDto,
  ScanSummaryDto,
} from '../../../../types/report.js';

function summarize(report: ScanReportDto): Omit<ScanSummaryDto, 'outputMode'> {
  const nodesByType: Record<string, number> = {};
  let missingIntentFractals = 0;
  for (const node of report.tree.nodes) {
    nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1;
    if (node.type === 'fractal' && !node.hasIntentMd) missingIntentFractals++;
  }
  return {
    root: report.tree.root,
    depth: report.tree.depth,
    totalNodes: report.tree.totalNodes,
    nodesByType,
    missingIntentFractals,
    timestamp: report.timestamp,
    duration: report.duration,
  };
}

function project(
  report: ScanReportDto,
  outputMode: 'full' | 'summary' | 'paths',
): ScanResultDto {
  if (outputMode === 'summary') return { outputMode, ...summarize(report) };
  if (outputMode === 'paths')
    return {
      outputMode,
      root: report.tree.root,
      totalNodes: report.tree.totalNodes,
      nodes: report.tree.nodes.map((n) => ({
        path: n.path,
        type: n.type,
        hasIntentMd: n.hasIntentMd,
        hasDetailMd: n.hasDetailMd,
      })),
      timestamp: report.timestamp,
      duration: report.duration,
    };
  return report;
}

/**
 * Shape the fractal_scan response for the requested output mode, degrading
 * oversized payloads to a `{ truncated, reportPath, summary }` envelope. The
 * full report is always the file content, so a truncated `paths` caller can
 * still grep everything.
 */
export function buildScanResult(
  report: ScanReportDto,
  outputMode: 'full' | 'summary' | 'paths',
  maxChars: number,
  scanPath: string,
): ScanResultDto {
  const projected = project(report, outputMode);
  if (JSON.stringify(projected).length <= maxChars) return projected;

  const cacheDir = getCacheDir(scanPath);
  mkdirSync(cacheDir, { recursive: true });
  const reportPath = join(cacheDir, 'scan-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 1));

  return {
    outputMode,
    truncated: true,
    reportPath,
    summary: summarize(report),
  };
}
