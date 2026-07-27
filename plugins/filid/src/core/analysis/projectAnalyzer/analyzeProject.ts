import { createAdapterRegistry } from '../../../adapters/index.js';
import type { SyncPlan } from '../../../types/drift.js';
import type {
  AnalysisReport,
  AnalyzeOptions,
  DriftReport,
  ScanReport,
  ValidationReport,
} from '../../../types/report.js';
import {
  createDefaultConfig,
  loadConfig,
  resolveMaxDepth,
} from '../../infra/configLoader/configLoader.js';
import { createProjectSnapshot } from '../../projectSnapshot/index.js';
import {
  detectDrift,
  generateSyncPlan,
} from '../../rules/driftDetector/driftDetector.js';
import { validateStructure } from '../../rules/fractalValidator/fractalValidator.js';
import {
  getActiveRules,
  loadBuiltinRules,
} from '../../rules/ruleEngine/ruleEngine.js';

import { calculateHealthScore } from './calculateHealthScore.js';

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

  // 0. 설정 — validateStructure 를 룰 없이 부르면 미설정 기본 룰셋으로
  // 폴백해, 프로젝트가 명시적으로 예외 처리한 위반이 violations 와
  // healthScore 에 그대로 새어 들어간다 (drift_detect 에서 실측된 버그와
  // 동일 계열). 반드시 structure_validate 와 같은 룰셋으로 평가한다.
  const { config } = loadConfig(root);
  const effectiveConfig = config ?? createDefaultConfig();
  const rules = getActiveRules(
    loadBuiltinRules(
      effectiveConfig.rules,
      effectiveConfig.structure?.additionalAllowedPeers,
    ),
  );
  const maxDepth = resolveMaxDepth(effectiveConfig);

  // 1. 동일 snapshot 생성
  const scanStart = Date.now();
  const snapshot = await createProjectSnapshot(
    root,
    createAdapterRegistry(),
    effectiveConfig,
  );
  const tree = snapshot.tree;

  const scanReport: ScanReport = {
    tree,
    modules: [],
    timestamp: new Date().toISOString(),
    duration: Date.now() - scanStart,
  };

  // 2. 검증
  const validationReport: ValidationReport = validateStructure(
    snapshot,
    rules,
    { maxDepth },
  );

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
  } else driftReport = emptyDriftReport();

  // 4. 종합
  const summary = {
    totalModules: tree.totalNodes,
    violations: validationReport.result.violations.length,
    drifts: driftReport.drift.totalDrifts,
    healthScore: 0,
  };

  const report: AnalysisReport = {
    snapshot,
    scan: scanReport,
    validation: validationReport,
    drift: driftReport,
    summary,
  };

  report.summary.healthScore = calculateHealthScore(report);

  return report;
}
