import type { SyncPlan } from '../../../types/drift.js';
import type { ModuleInfo } from '../../../types/fractal.js';
import type {
  AnalysisReport,
  AnalyzeOptions,
  DriftReport,
  ScanReport,
  ValidationReport,
} from '../../../types/report.js';
import { analyzeModule } from '../../module/module-main-analyzer/module-main-analyzer.js';
import { detectDrift, generateSyncPlan } from '../../rules/drift-detector/drift-detector.js';
import { validateStructure } from '../../rules/fractal-validator/fractal-validator.js';
import { scanProject } from '../../tree/fractal-tree/fractal-tree.js';

import { calculateHealthScore } from './calculate-health-score.js';

function emptyDriftReport(): DriftReport {
  return {
    drift: {
      items: [],
      totalDrifts: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      scanTimestamp: new Date().toISOString(),
    },
    syncPlan: null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 프로젝트 루트에서 시작하여 전체 분석 파이프라인을 실행한다.
 *
 * 파이프라인:
 * 1. fractal-tree.scanProject() → ScanReport
 * 2. fractal-validator.validateStructure() → ValidationReport
 * 3. drift-detector.detectDrift() → DriftReport
 * 4. calculateHealthScore() → summary.healthScore
 *
 * @param root - 분석할 프로젝트 루트의 절대 경로
 * @param options - 분석 옵션 (detailed, includeDrift, generateSyncPlan)
 * @returns 종합 분석 보고서
 */
export async function analyzeProject(
  root: string,
  options?: AnalyzeOptions,
): Promise<AnalysisReport> {
  const opts: Required<AnalyzeOptions> = {
    detailed: true,
    includeDrift: true,
    generateSyncPlan: false,
    ...options,
  };

  // 1. 스캔
  const scanStart = Date.now();
  const tree = await scanProject(root);
  const moduleTargets = [...tree.nodes.values()].filter(
    (n) => n.type === 'fractal' || n.type === 'hybrid',
  );
  const moduleResults = await Promise.allSettled(
    moduleTargets.map((n) => analyzeModule(n.path)),
  );
  const modules: ModuleInfo[] = [];
  for (const r of moduleResults) {
    if (r.status === 'fulfilled') modules.push(r.value);
  }
  const scanReport: ScanReport = {
    tree,
    modules,
    timestamp: new Date().toISOString(),
    duration: Date.now() - scanStart,
  };

  // 2. 검증
  const validationReport: ValidationReport = validateStructure(tree);

  // 3. 이격 감지
  let driftReport: DriftReport;
  if (opts.includeDrift) {
    const driftResult = detectDrift(tree, validationReport.result.violations, {
      generatePlan: opts.generateSyncPlan,
    });
    const syncPlan: SyncPlan | null = opts.generateSyncPlan
      ? generateSyncPlan(driftResult.items)
      : null;
    driftReport = {
      drift: driftResult,
      syncPlan,
      timestamp: new Date().toISOString(),
    };
  } else {
    driftReport = emptyDriftReport();
  }

  // 4. 종합
  const summary = {
    totalModules: tree.totalNodes,
    violations: validationReport.result.violations.length,
    drifts: driftReport.drift.totalDrifts,
    healthScore: 0,
  };

  const report: AnalysisReport = {
    scan: scanReport,
    validation: validationReport,
    drift: driftReport,
    summary,
  };

  report.summary.healthScore = calculateHealthScore(report);

  return report;
}
